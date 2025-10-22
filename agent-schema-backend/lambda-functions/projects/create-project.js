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
    // Debug logging
    console.log('Event:', JSON.stringify(event, null, 2));

    const userId = getUserId(event);
    const requestBody = parseBody(event.body);

    if (!requestBody.name) throw new Error('Project name is required');
    if (!requestBody.description) throw new Error('Project description is required');

    if (!process.env.PROJECTS_TABLE) {
      throw new Error('PROJECTS_TABLE environment variable is not set');
    }

    const now = getCurrentTimestamp();
    const projectId = generateId();

    const project = {
      userId,
      projectId,
      name: requestBody.name,
      description: requestBody.description,
      config: {
        main_agent: {
          name: '',
          description: '',
          system_prompt: '',
          model: {
            region: 'us-east-1',
            model_id: ''
          }
        },
        agents: [],
        tools: [],
        environment: {}
      },
      createdAt: now,
      updatedAt: now,
    };

    await dynamoDb.send(new PutCommand({
      TableName: process.env.PROJECTS_TABLE,
      Item: project,
    }));

    return createResponse(201, project);

  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('required')) {
      return createResponse(400, undefined, error.message);
    }
    return createResponse(500, error, error);
  }
};