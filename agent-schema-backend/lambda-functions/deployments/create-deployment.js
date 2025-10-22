const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

exports.handler = async (event, context) => {
  try {


    const userId = getUserId(event);
    const requestBody = parseBody(event.body);

    if (!requestBody.projectId) throw new Error('Project ID is required');

    const deployment = {
      userId,
      deploymentId: generateId(),
      projectId: requestBody.projectId,
      status: 'pending',
      config: requestBody.config || {},
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await dynamoDb.send(new PutCommand({
      TableName: process.env.DEPLOYMENTS_TABLE,
      Item: deployment
    }));

    // In a real implementation, this would trigger the actual deployment process
    // For now, we'll just mark it as successful
    deployment.status = 'success';
    deployment.updatedAt = getCurrentTimestamp();

    await dynamoDb.send(new PutCommand({
      TableName: process.env.DEPLOYMENTS_TABLE,
      Item: deployment
    }));

    return createResponse(201, deployment);

  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('required')) {
      return createResponse(400, undefined, error.message);
    }
    return createResponse(500, undefined, 'Internal server error');
  }
};