const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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
    const agentId = event.pathParameters?.agentId;

    if (!agentId) {
      return createResponse(400, undefined, 'Agent ID is required');
    }

    // First, get the agent to find its projectId
    const getAgentParams = {
      TableName: process.env.AGENTS_TABLE,
      Key: { userId, agentId }
    };

    const agentResult = await dynamoDb.send(new GetCommand(getAgentParams));
    
    if (!agentResult.Item) {
      return createResponse(404, undefined, 'Agent not found');
    }

    const projectId = agentResult.Item.projectId;

    // Delete the agent
    await dynamoDb.send(new DeleteCommand({
      TableName: process.env.AGENTS_TABLE,
      Key: { userId, agentId }
    }));

    // Remove agent from project's agentIds array
    const updateProjectParams = {
      TableName: process.env.PROJECTS_TABLE,
      Key: { userId, projectId },
      UpdateExpression: 'SET agentIds = :newAgentIds, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':agentId': agentId,
        ':updatedAt': new Date().toISOString(),
      },
    };

    // Get current project to filter out the deleted agent
    const getProjectParams = {
      TableName: process.env.PROJECTS_TABLE,
      Key: { userId, projectId }
    };

    const projectResult = await dynamoDb.send(new GetCommand(getProjectParams));
    
    if (projectResult.Item && projectResult.Item.agentIds) {
      const newAgentIds = projectResult.Item.agentIds.filter(id => id !== agentId);
      updateProjectParams.ExpressionAttributeValues[':newAgentIds'] = newAgentIds;
      await dynamoDb.send(new UpdateCommand(updateProjectParams));
    }

    return createResponse(204);

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, undefined, 'Internal server error');
  }
};