// Test script for create-tool Lambda function
// Run with: node test-create-tool.js

// Mock AWS SDK for local testing
const mockDynamoDb = {
  send: async (command) => {
    console.log('Mock DynamoDB operation:', {
      operation: command.constructor.name,
      tableName: command.input.TableName,
      item: command.input.Item,
      key: command.input.Key,
      updateExpression: command.input.UpdateExpression
    });
    return { success: true };
  }
};

// Set up environment variables for testing
process.env.TOOLS_TABLE = 'multi-agent-tools-dev';
process.env.PROJECTS_TABLE = 'multi-agent-projects-dev';
process.env.AWS_REGION = 'us-east-1';

// Mock the AWS SDK modules
const mockPutCommand = class PutCommand {
  constructor(input) {
    this.input = input;
  }
};

const mockUpdateCommand = class UpdateCommand {
  constructor(input) {
    this.input = input;
  }
};

// Replace the imports with mocks
const { DynamoDBClient } = { DynamoDBClient: class {} };
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = { 
  DynamoDBDocumentClient: { from: () => mockDynamoDb },
  PutCommand: mockPutCommand,
  UpdateCommand: mockUpdateCommand
};

// Copy the handler code with mocked dependencies
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
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
const handler = async (event) => {
  try {
    console.log('Environment variables:', {
      TOOLS_TABLE: process.env.TOOLS_TABLE,
      PROJECTS_TABLE: process.env.PROJECTS_TABLE,
      AWS_REGION: process.env.AWS_REGION
    });

    const userId = getUserId(event);
    const requestBody = parseBody(event.body);

    if (!requestBody.projectId) throw new Error('Project ID is required');
    if (!requestBody.name) throw new Error('Tool name is required');
    if (!requestBody.type) throw new Error('Tool type is required');

    const now = getCurrentTimestamp();
    const toolId = `${requestBody.projectId}-${generateId()}`;

    const tool = {
      userId,
      toolId,
      projectId: requestBody.projectId,
      name: requestBody.name,
      config: {
        name: requestBody.name,
        description: requestBody.description || '',
        type: requestBody.type,
        inputSchema: requestBody.inputSchema || { type: 'object', properties: {} },
        ...(requestBody.code && { code: requestBody.code })
      },
      createdAt: now,
      updatedAt: now
    };

    // Create the tool
    await dynamoDb.send(new PutCommand({
      TableName: process.env.TOOLS_TABLE,
      Item: tool
    }));

    // Update the project to add this tool to its toolIds array
    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.PROJECTS_TABLE,
      Key: {
        userId,
        projectId: requestBody.projectId
      },
      UpdateExpression: 'SET toolIds = list_append(if_not_exists(toolIds, :empty_list), :toolId), updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':toolId': [toolId],
        ':empty_list': [],
        ':updatedAt': now
      }
    }));

    return createResponse(201, tool);

  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('required')) {
      return createResponse(400, undefined, error.message);
    }
    return createResponse(500, undefined, 'Internal server error');
  }
};

// Test function
async function testCreateTool() {
  console.log('🧪 Testing create-tool Lambda handler...\n');

  // Test case 1: Valid frontend_action tool
  console.log('Test 1: Valid frontend_action tool creation');
  const validEvent1 = {
    httpMethod: 'POST',
    body: JSON.stringify({
      projectId: 'proj-123',
      name: 'email-sender',
      description: 'Send emails to specified recipients',
      type: 'frontend_action',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Email recipient' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body' }
        },
        required: ['to', 'subject', 'body']
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
    const result = await handler(validEvent1);
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    const responseBody = JSON.parse(result.body);
    console.log('✅ Response body:', responseBody);
    console.log('✅ Tool ID format:', responseBody.data?.toolId);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 2: Valid code tool with code
  console.log('Test 2: Valid code tool creation with code');
  const validEvent2 = {
    httpMethod: 'POST',
    body: JSON.stringify({
      projectId: 'proj-456',
      name: 'data-processor',
      description: 'Process data using Python',
      type: 'code',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Input data' }
        },
        required: ['data']
      },
      code: 'def process_data(data):\n    return data.upper()'
    }),
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: 'test-user-456'
          }
        }
      }
    }
  };

  try {
    const result = await handler(validEvent2);
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    const responseBody = JSON.parse(result.body);
    console.log('✅ Response body:', responseBody);
    console.log('✅ Code included:', !!responseBody.data?.config?.code);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 3: Missing required fields
  console.log('Test 3: Missing tool name');
  const invalidEvent1 = {
    httpMethod: 'POST',
    body: JSON.stringify({
      projectId: 'proj-123',
      description: 'Tool without name',
      type: 'frontend_action'
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
    const result = await handler(invalidEvent1);
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✅ Response body:', JSON.parse(result.body));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 4: Missing project ID
  console.log('Test 4: Missing project ID');
  const invalidEvent2 = {
    httpMethod: 'POST',
    body: JSON.stringify({
      name: 'test-tool',
      description: 'Tool without project ID',
      type: 'frontend_action'
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
    const result = await handler(invalidEvent2);
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✅ Response body:', JSON.parse(result.body));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 Testing completed!');
}

// Run the test
if (require.main === module) {
  testCreateTool().catch(console.error);
}

module.exports = { handler, testCreateTool };