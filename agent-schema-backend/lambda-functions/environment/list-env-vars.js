const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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

    // Query with begins_with on envId format: project-{projectId}-{key}
    const result = await dynamoDb.send(new QueryCommand({
      TableName: process.env.ENVIRONMENT_TABLE,
      KeyConditionExpression: 'userId = :userId AND begins_with(envId, :prefix)',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':prefix': `project-${projectId}-`
      }
    }));

    return createResponse(200, {
      items: result.Items || [],
      count: result.Count || 0
    });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, undefined, 'Internal server error');
  }
};