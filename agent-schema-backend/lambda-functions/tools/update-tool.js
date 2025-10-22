const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function getUserId(event) {
  return event.requestContext.authorizer.jwt.claims.sub;
}

function parseBody(body) {
  if (!body) throw new Error('Request body is required');
  return JSON.parse(body);
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
    const requestBody = parseBody(event.body);

    if (!toolId) {
      return createResponse(400, undefined, 'Tool ID is required');
    }

    // Get existing tool
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

    const existingTool = existingResult.Item;
    const now = getCurrentTimestamp();

    // Update tool with new values
    const updatedTool = {
      ...existingTool,
      updatedAt: now,
      ...(requestBody.name && { name: requestBody.name }),
      config: {
        ...existingTool.config,
        ...(requestBody.name && { name: requestBody.name }),
        ...(requestBody.description !== undefined && { description: requestBody.description }),
        ...(requestBody.type && { type: requestBody.type }),
        ...(requestBody.inputSchema && { inputSchema: requestBody.inputSchema }),
        ...(requestBody.code !== undefined && { code: requestBody.code })
      }
    };

    await dynamoDb.send(new PutCommand({
      TableName: process.env.TOOLS_TABLE,
      Item: updatedTool
    }));

    return createResponse(200, updatedTool);

  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('required')) {
      return createResponse(400, undefined, error.message);
    }
    return createResponse(500, undefined, 'Internal server error');
  }
};