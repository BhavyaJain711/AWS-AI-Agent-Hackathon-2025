const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

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
    const requestBody = parseBody(event.body);

    if (!requestBody.projectId) throw new Error('Project ID is required');
    if (!requestBody.key) throw new Error('Environment variable key is required');

    // envId format: project-{projectId}-{key}
    const envId = `project-${requestBody.projectId}-${requestBody.key}`;

    const envVar = {
      userId,
      envId,
      projectId: requestBody.projectId,
      key: requestBody.key,
      value: requestBody.value || '',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await dynamoDb.send(new PutCommand({
      TableName: process.env.ENVIRONMENT_TABLE,
      Item: envVar
    }));

    return createResponse(201, envVar);

  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('required')) {
      return createResponse(400, undefined, error.message);
    }
    return createResponse(500, undefined, 'Internal server error');
  }
};