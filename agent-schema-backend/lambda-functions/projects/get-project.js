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

exports.handler = async (event, context) => {
  try {
    const userId = getUserId(event);
    const projectId = event.pathParameters?.projectId;

    if (!projectId) {
      return createResponse(400, undefined, 'Project ID is required');
    }

    if (!process.env.PROJECTS_TABLE) {
      throw new Error('PROJECTS_TABLE environment variable is not set');
    }

    const getParams = {
      TableName: process.env.PROJECTS_TABLE,
      Key: {
        userId: userId,
        projectId: projectId,
      },
    };

    const result = await dynamoDb.send(new GetCommand(getParams));

    if (!result.Item) {
      return createResponse(404, undefined, 'Project not found');
    }

    return createResponse(200, result.Item);

  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('required')) {
      return createResponse(400, undefined, error.message);
    }
    return createResponse(500, undefined, 'Internal server error');
  }
};