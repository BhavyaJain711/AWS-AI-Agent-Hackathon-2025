const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Create DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dynamoDb = DynamoDBDocumentClient.from(client);

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

exports.handler = async (event) => {
  try {


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