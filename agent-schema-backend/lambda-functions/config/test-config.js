// Test script for config Lambda functions
// Run with: node test-config.js

// Mock AWS SDK for local testing
const mockDynamoDb = {
  send: async (command) => {
    console.log('Mock DynamoDB operation:', {
      operation: command.constructor.name,
      tableName: command.input.TableName,
      item: command.input.Item,
      key: command.input.Key
    });
    
    // Mock responses based on operation
    if (command.constructor.name === 'GetCommand') {
      // Return mock config data for get operations
      return {
        Item: {
          userId: 'test-user-123',
          configId: 'project-proj-123',
          projectId: 'proj-123',
          config: {
            name: 'Test Main Agent',
            description: 'Test orchestrator agent',
            system_prompt: 'You are a test orchestrator agent.',
            model: {
              region: 'us-east-1',
              model_id: 'anthropic.claude-3-sonnet-20240229-v1:0'
            }
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      };
    }
    
    return { success: true };
  }
};

// Set up environment variables for testing
process.env.MAIN_CONFIG_TABLE = 'multi-agent-main-config-dev';
process.env.AWS_REGION = 'us-east-1';

// Mock the AWS SDK modules
const mockPutCommand = class PutCommand {
  constructor(input) {
    this.input = input;
  }
};

const mockGetCommand = class GetCommand {
  constructor(input) {
    this.input = input;
  }
};

// Replace the imports with mocks
const { DynamoDBClient } = { DynamoDBClient: class {} };
const { DynamoDBDocumentClient, PutCommand, GetCommand } = { 
  DynamoDBDocumentClient: { from: () => mockDynamoDb },
  PutCommand: mockPutCommand,
  GetCommand: mockGetCommand
};

// Common functions
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

// Update main config handler
const updateHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const projectId = event.pathParameters?.projectId;
    const requestBody = parseBody(event.body);

    if (!projectId) {
      return createResponse(400, undefined, 'Project ID is required');
    }

    const configId = `project-${projectId}`;
    
    const config = {
      userId,
      configId,
      projectId,
      config: {
        name: requestBody.mainAgent?.name || '',
        description: requestBody.mainAgent?.description || '',
        system_prompt: requestBody.mainAgent?.system_prompt || '',
        model: requestBody.mainAgent?.model || { region: '', model_id: '' }
      },
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await dynamoDb.send(new PutCommand({
      TableName: process.env.MAIN_CONFIG_TABLE,
      Item: config
    }));

    return createResponse(200, config);

  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('required')) {
      return createResponse(400, undefined, error.message);
    }
    return createResponse(500, undefined, 'Internal server error');
  }
};

// Get main config handler
const getHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const projectId = event.pathParameters?.projectId;

    if (!projectId) {
      return createResponse(400, undefined, 'Project ID is required');
    }

    const configId = `project-${projectId}`;
    
    const result = await dynamoDb.send(new GetCommand({
      TableName: process.env.MAIN_CONFIG_TABLE,
      Key: { userId, configId }
    }));

    if (!result.Item) {
      return createResponse(404, undefined, 'Main config not found');
    }

    return createResponse(200, result.Item);

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, undefined, 'Internal server error');
  }
};

// Test function
async function testConfigFunctions() {
  console.log('🧪 Testing config Lambda handlers...\n');

  // Test case 1: Update main config
  console.log('Test 1: Update main config');
  const updateEvent = {
    httpMethod: 'PUT',
    pathParameters: {
      projectId: 'proj-123'
    },
    body: JSON.stringify({
      mainAgent: {
        name: 'Main Orchestrator',
        description: 'Main orchestrator agent that routes queries to specialized agents',
        system_prompt: 'You are the main orchestrator agent responsible for routing user queries to the most appropriate specialized agent.',
        model: {
          region: 'us-east-1',
          model_id: 'anthropic.claude-3-sonnet-20240229-v1:0'
        }
      }
    }),
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: 'test-user-123'
          }
        }
      }
    }
  };

  try {
    const result = await updateHandler(updateEvent);
    console.log('✅ Update Result:', JSON.stringify(result, null, 2));
    const responseBody = JSON.parse(result.body);
    console.log('✅ Config ID format:', responseBody.data?.configId);
    console.log('✅ Config structure:', responseBody.data?.config);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 2: Get main config
  console.log('Test 2: Get main config');
  const getEvent = {
    httpMethod: 'GET',
    pathParameters: {
      projectId: 'proj-123'
    },
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: 'test-user-123'
          }
        }
      }
    }
  };

  try {
    const result = await getHandler(getEvent);
    console.log('✅ Get Result:', JSON.stringify(result, null, 2));
    const responseBody = JSON.parse(result.body);
    console.log('✅ Retrieved config:', responseBody.data?.config);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 3: Missing project ID
  console.log('Test 3: Missing project ID');
  const invalidEvent = {
    httpMethod: 'PUT',
    pathParameters: {},
    body: JSON.stringify({
      mainAgent: {
        name: 'Test Agent'
      }
    }),
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: 'test-user-123'
          }
        }
      }
    }
  };

  try {
    const result = await updateHandler(invalidEvent);
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✅ Response body:', JSON.parse(result.body));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 Testing completed!');
}

// Run the test
if (require.main === module) {
  testConfigFunctions().catch(console.error);
}

module.exports = { updateHandler, getHandler, testConfigFunctions };