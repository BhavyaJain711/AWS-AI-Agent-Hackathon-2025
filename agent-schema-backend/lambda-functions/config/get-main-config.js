const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);

function getUserId(event) {
  return event.requestContext.authorizer.jwt.claims.sub;
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
    const projectId = event.pathParameters?.projectId;

    if (!projectId) {
      return createResponse(400, undefined, 'Project ID is required');
    }

    const configId = `project-${projectId}`;
    
    const result = await dynamoDb.send(new GetCommand({
      TableName: process.env.MAIN_CONFIG_TABLE,
      Key: { userId, configId }
    }));

    if (!result.Item) {
      return createResponse(404, undefined, 'Main config not found');
    }

    return createResponse(200, result.Item);

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, undefined, 'Internal server error');
  }
};