const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

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
    const requestBody = parseBody(event.body);

    if (!requestBody.projectId) throw new Error('Project ID is required');
    if (!requestBody.name) throw new Error('Tool name is required');
    if (!requestBody.type) throw new Error('Tool type is required');

    const now = getCurrentTimestamp();
    const toolId = `${requestBody.projectId}-${generateId()}`;

    const tool = {
      userId,
      toolId,
      projectId: requestBody.projectId,
      name: requestBody.name,
      config: {
        name: requestBody.name,
        description: requestBody.description || '',
        type: requestBody.type,
        inputSchema: requestBody.inputSchema || { type: 'object', properties: {} },
        ...(requestBody.code && { code: requestBody.code })
      },
      createdAt: now,
      updatedAt: now
    };

    // Create the tool
    await dynamoDb.send(new PutCommand({
      TableName: process.env.TOOLS_TABLE,
      Item: tool
    }));

    // Update the project to add this tool to its toolIds array
    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.PROJECTS_TABLE,
      Key: {
        userId,
        projectId: requestBody.projectId
      },
      UpdateExpression: 'SET toolIds = list_append(if_not_exists(toolIds, :empty_list), :toolId), updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':toolId': [toolId],
        ':empty_list': [],
        ':updatedAt': now
      }
    }));

    return createResponse(201, tool);

  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('required')) {
      return createResponse(400, undefined, error.message);
    }
    return createResponse(500, undefined, 'Internal server error');
  }
};