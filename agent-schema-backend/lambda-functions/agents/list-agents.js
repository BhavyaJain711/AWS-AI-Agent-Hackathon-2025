const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

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

    // Get project to get agentIds
    const project = await dynamoDb.send(new GetCommand({
      TableName: process.env.PROJECTS_TABLE,
      Key: { userId, projectId },
    }));

    if (!project.Item) {
      return createResponse(404, undefined, 'Project not found');
    }

    const agentIds = project.Item.agentIds || [];
    
    if (agentIds.length === 0) {
      return createResponse(200, { items: [], count: 0 });
    }

    // Batch get agents
    const agents = await dynamoDb.send(new BatchGetCommand({
      RequestItems: {
        [process.env.AGENTS_TABLE]: {
          Keys: agentIds.map(agentId => ({ userId, agentId })),
        },
      },
    }));

    const items = agents.Responses[process.env.AGENTS_TABLE] || [];

    return createResponse(200, {
      items,
      count: items.length,
    });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, undefined, 'Internal server error');
  }
};