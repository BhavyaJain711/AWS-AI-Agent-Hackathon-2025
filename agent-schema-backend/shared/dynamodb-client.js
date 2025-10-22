const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Create DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Create DynamoDB Document client for easier JSON handling
const dynamoDb = DynamoDBDocumentClient.from(client);

module.exports = { dynamoDb };