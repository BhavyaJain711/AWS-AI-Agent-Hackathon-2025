const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);

function getUserId(event) {
  return event.requestContext.authorizer.jwt.claims.sub;
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function createResponse(statusCode, data, error) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify({
      success: statusCode >= 200 && statusCode < 300,
      ...(data && { data }),
      ...(error && { error }),
    }),
  };
}

exports.handler = async (event) => {
  try {
    const userId = getUserId(event);
    const toolId = event.pathParameters?.toolId;

    if (!toolId) {
      return createResponse(400, undefined, 'Tool ID is required');
    }

    // Check if tool exists
    const existingResult = await dynamoDb.send(new GetCommand({
      TableName: process.env.TOOLS_TABLE,
      Key: {
        userId,
        toolId
      }
    }));

    if (!existingResult.Item) {
      return createResponse(404, undefined, 'Tool not found');
    }

    const tool = existingResult.Item;
    const projectId = tool.projectId;
    const now = getCurrentTimestamp();

    // Delete the tool
    await dynamoDb.send(new DeleteCommand({
      TableName: process.env.TOOLS_TABLE,
      Key: {
        userId,
        toolId
      }
    }));

    // Remove the toolId from the project's toolIds array
    // First, get the project to find the index of the toolId
    const projectResult = await dynamoDb.send(new GetCommand({
      TableName: process.env.PROJECTS_TABLE,
      Key: {
        userId,
        projectId
      }
    }));

    if (projectResult.Item && projectResult.Item.toolIds) {
      const toolIndex = projectResult.Item.toolIds.indexOf(toolId);
      if (toolIndex !== -1) {
        // Remove the toolId from the array
        await dynamoDb.send(new UpdateCommand({
          TableName: process.env.PROJECTS_TABLE,
          Key: {
            userId,
            projectId
          },
          UpdateExpression: `REMOVE toolIds[${toolIndex}] SET updatedAt = :updatedAt`,
          ExpressionAttributeValues: {
            ':updatedAt': now
          }
        }));
      }
    }

    return createResponse(200, { message: 'Tool deleted successfully' });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, undefined, 'Internal server error');
  }
};