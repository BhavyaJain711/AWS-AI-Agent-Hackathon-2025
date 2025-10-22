const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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
    const agentId = event.pathParameters?.agentId;
    const requestBody = parseBody(event.body);

    if (!agentId) throw new Error('Agent ID is required');

    // Build config object from request body (same format as create-agent)
    const config = {
      name: requestBody.name,
      description: requestBody.description,
      type: 'agent_tool',
      system_prompt: requestBody.systemPrompt,
      tools: requestBody.tools || [],
      builtin_tools: requestBody.builtinTools || [],
      model: {
        region: requestBody.model?.region,
        model_id: requestBody.model?.model_id,
      },
    };

    const updateParams = {
      TableName: process.env.AGENTS_TABLE,
      Key: { userId, agentId },
      UpdateExpression: 'SET #name = :name, #config = :config, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#config': 'config'
      },
      ExpressionAttributeValues: {
        ':name': requestBody.name,
        ':config': config,
        ':updatedAt': getCurrentTimestamp()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDb.send(new UpdateCommand(updateParams));
    return createResponse(200, result.Attributes);

  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('required')) {
      return createResponse(400, undefined, error.message);
    }
    return createResponse(500, undefined, 'Internal server error');
  }
};