const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Create DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dynamoDb = DynamoDBDocumentClient.from(client);

// Utility functions
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
  if (!body) {
    throw new Error('Request body is required');
  }
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

function handleError(error) {
  console.error('Lambda error:', error);
  
  if (error.message.includes('required')) {
    return createResponse(400, undefined, error.message);
  }
  
  if (error.message.includes('not found')) {
    return createResponse(404, undefined, error.message);
  }
  
  return createResponse(500, undefined, 'Internal server error');
}

exports.handler = async (event, context) => {
  try {


    const userId = getUserId(event);
    const requestBody = parseBody(event.body);

    // Validate required fields
    if (!requestBody.projectId) throw new Error('projectId is required');
    if (!requestBody.name) throw new Error('name is required');
    if (!requestBody.description) throw new Error('description is required');
    if (!requestBody.systemPrompt) throw new Error('systemPrompt is required');
    if (!requestBody.model) throw new Error('model is required');
    if (!requestBody.model.region) throw new Error('model.region is required');
    if (!requestBody.model.model_id) throw new Error('model.model_id is required');

    // Create agent
    const now = getCurrentTimestamp();
    const agentId = generateId();
    
    const agent = {
      userId,
      agentId,
      projectId: requestBody.projectId,
      name: requestBody.name,
      config: {
        name: requestBody.name,
        description: requestBody.description,
        type: 'agent_tool',
        system_prompt: requestBody.systemPrompt,
        tools: requestBody.tools || [],
        builtin_tools: requestBody.builtinTools || [],
        model: {
          region: requestBody.model.region,
          model_id: requestBody.model.model_id,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    // Save agent to DynamoDB
    const putParams = {
      TableName: process.env.AGENTS_TABLE,
      Item: agent,
    };

    await dynamoDb.send(new PutCommand(putParams));

    // Update project's agentIds array
    const updateProjectParams = {
      TableName: process.env.PROJECTS_TABLE,
      Key: { userId, projectId: requestBody.projectId },
      UpdateExpression: 'SET agentIds = list_append(if_not_exists(agentIds, :empty_list), :agentId), updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':agentId': [agentId],
        ':empty_list': [],
        ':updatedAt': now,
      },
    };

    await dynamoDb.send(new UpdateCommand(updateProjectParams));

    return createResponse(201, agent);

  } catch (error) {
    return handleError(error);
  }
};