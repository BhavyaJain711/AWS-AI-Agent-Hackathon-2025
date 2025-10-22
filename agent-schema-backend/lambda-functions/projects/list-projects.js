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

exports.handler = async (event, context) => {
  try {
    // Debug logging
    console.log('Environment variables:', {
      PROJECTS_TABLE: process.env.PROJECTS_TABLE,
      AWS_REGION: process.env.AWS_REGION
    });



    const userId = getUserId(event);

    if (!process.env.PROJECTS_TABLE) {
      throw new Error('PROJECTS_TABLE environment variable is not set');
    }

    const tableName = process.env.PROJECTS_TABLE || 'multi-agent-projects-dev';

    const queryParams = {
      TableName: tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ProjectionExpression: 'projectId, #name, description, createdAt, updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ScanIndexForward: false,
    };

    const result = await dynamoDb.send(new QueryCommand(queryParams));

    return createResponse(200, {
      items: result.Items || [],
      count: result.Count || 0,
    });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, undefined, 'Internal server error');
  }
};