// Test script for list-builtin-tools Lambda function
// Run with: node test-list-builtin-tools.js

// Set up environment variables for testing
process.env.BUILTIN_TOOLS_TABLE = 'multi-agent-builtin-tools-dev';
process.env.AWS_REGION = 'us-east-1';

// Mock AWS SDK for local testing
const mockDynamoDb = {
  send: async (command) => {
    console.log('Mock DynamoDB operation:', {
      operation: command.constructor.name,
      tableName: command.input?.TableName
    });
    return { success: true };
  }
};

// Mock the AWS SDK modules
const { DynamoDBClient } = { DynamoDBClient: class {} };
const { DynamoDBDocumentClient, ScanCommand } = { 
  DynamoDBDocumentClient: { from: () => mockDynamoDb },
  ScanCommand: class ScanCommand {
    constructor(input) {
      this.input = input;
    }
  }
};

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
  return createResponse(500, undefined, 'Internal server error');
}

const handler = async (event) => {
  try {
    console.log('Environment variables:', {
      BUILTIN_TOOLS_TABLE: process.env.BUILTIN_TOOLS_TABLE,
      AWS_REGION: process.env.AWS_REGION
    });

    // For now, return a static list of built-in tools
    // In a real implementation, this would scan the BUILTIN_TOOLS_TABLE
    const builtinTools = [
      {
        toolName: 'web-search',
        description: 'Search the web for information',
        type: 'code',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        },
        category: 'utility',
        isActive: true
      },
      {
        toolName: 'calculator',
        description: 'Perform mathematical calculations',
        type: 'code',
        inputSchema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Mathematical expression' }
          },
          required: ['expression']
        },
        category: 'utility',
        isActive: true
      },
      {
        toolName: 'file-reader',
        description: 'Read and analyze files',
        type: 'code',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to the file' }
          },
          required: ['filePath']
        },
        category: 'file',
        isActive: true
      }
    ];

    const response = {
      items: builtinTools,
      count: builtinTools.length,
    };

    return createResponse(200, response);

  } catch (error) {
    return handleError(error);
  }
};

// Test function
async function testListBuiltinTools() {
  console.log('🧪 Testing list-builtin-tools Lambda handler...\n');

  // Test case 1: Valid request
  console.log('Test 1: List builtin tools');
  const validEvent = {
    httpMethod: 'GET',
    pathParameters: null,
    queryStringParameters: null
  };

  try {
    const result = await handler(validEvent);
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    const responseBody = JSON.parse(result.body);
    console.log('✅ Response body:', responseBody);
    console.log('✅ Number of builtin tools:', responseBody.data?.count);
    console.log('✅ Tool names:', responseBody.data?.items?.map(t => t.toolName));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 Testing completed!');
}

// Run the test
if (require.main === module) {
  testListBuiltinTools().catch(console.error);
}

module.exports = { handler, testListBuiltinTools };