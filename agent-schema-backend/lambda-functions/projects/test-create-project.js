// Test script for create-project Lambda function
// Run with: node test-create-project.js

// Mock AWS SDK for local testing
const mockDynamoDb = {
  send: async (command) => {
    console.log('Mock DynamoDB operation:', {
      operation: command.constructor.name,
      tableName: command.input.TableName,
      item: command.input.Item
    });
    return { success: true };
  }
};

// Set up environment variables for testing
process.env.PROJECTS_TABLE = 'multi-agent-projects-dev';
process.env.AWS_REGION = 'us-east-1';

// Mock the AWS SDK modules
const mockPutCommand = class PutCommand {
  constructor(input) {
    this.input = input;
  }
};

// Replace the imports with mocks
const { DynamoDBClient } = { DynamoDBClient: class {} };
const { DynamoDBDocumentClient, PutCommand } = { 
  DynamoDBDocumentClient: { from: () => mockDynamoDb },
  PutCommand: mockPutCommand
};

// Copy the handler code with mocked dependencies
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

const dynamoDb = mockDynamoDb;

// The actual handler function
const handler = async (event, context) => {
  try {
    // Debug logging
    console.log('Environment variables:', {
      PROJECTS_TABLE: process.env.PROJECTS_TABLE,
      AWS_REGION: process.env.AWS_REGION
    });
    


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
      agentIds: [],
      toolIds: [],
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
    return createResponse(500, undefined, 'Internal server error');
  }
};

// Test function
async function testCreateProject() {
  console.log('🧪 Testing create-project Lambda handler...\n');

  // Test case 1: Valid request
  console.log('Test 1: Valid project creation');
  const validEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
      name: 'Test Project',
      description: 'This is a test project for validation'
    }),
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-123'
        }
      }
    }
  };

  try {
    const result = await handler(validEvent, {});
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✅ Response body:', JSON.parse(result.body));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 2: Missing name
  console.log('Test 2: Missing project name');
  const invalidEvent1 = {
    httpMethod: 'POST',
    body: JSON.stringify({
      description: 'This project has no name'
    }),
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-123'
        }
      }
    }
  };

  try {
    const result = await handler(invalidEvent1, {});
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✅ Response body:', JSON.parse(result.body));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 3: Wrong HTTP method
  console.log('Test 3: Wrong HTTP method');
  const invalidEvent2 = {
    httpMethod: 'GET',
    body: null,
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-123'
        }
      }
    }
  };

  try {
    const result = await handler(invalidEvent2, {});
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✅ Response body:', JSON.parse(result.body));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 Testing completed!');
}

// Run the test
if (require.main === module) {
  testCreateProject().catch(console.error);
}

module.exports = { handler, testCreateProject };