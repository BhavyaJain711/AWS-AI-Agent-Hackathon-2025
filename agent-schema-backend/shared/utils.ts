import { APIGatewayEvent, APIResponse, ValidationError, NotFoundError, ConflictError } from './types';

// Generate unique IDs
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get current ISO timestamp
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Extract user ID from Cognito JWT
export function getUserId(event: APIGatewayEvent): string {
  return event.requestContext.authorizer.jwt.claims.sub;
}

// Parse JSON body safely
export function parseBody<T>(body: string | null): T {
  if (!body) {
    throw new ValidationError('Request body is required');
  }
  
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }
}

// Create API response
export function createResponse<T>(
  statusCode: number,
  data?: T,
  error?: string
): { statusCode: number; headers: Record<string, string>; body: string } {
  const response: APIResponse<T> = {
    success: statusCode >= 200 && statusCode < 300,
    ...(data && { data }),
    ...(error && { error }),
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(response),
  };
}

// Handle errors and return appropriate response
export function handleError(error: unknown): { statusCode: number; headers: Record<string, string>; body: string } {
  console.error('Error:', error);

  if (error instanceof ValidationError) {
    return createResponse(400, undefined, error.message);
  }

  if (error instanceof NotFoundError) {
    return createResponse(404, undefined, error.message);
  }

  if (error instanceof ConflictError) {
    return createResponse(409, undefined, error.message);
  }

  // Generic error
  return createResponse(500, undefined, 'Internal server error');
}

// Validate required fields
export function validateRequired(obj: Record<string, any>, fields: string[]): void {
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
      throw new ValidationError(`Field '${field}' is required`, field);
    }
  }
}

// Validate string length
export function validateStringLength(value: string, field: string, min: number, max: number): void {
  if (value.length < min || value.length > max) {
    throw new ValidationError(`Field '${field}' must be between ${min} and ${max} characters`, field);
  }
}

// Validate enum values
export function validateEnum<T>(value: T, field: string, allowedValues: T[]): void {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(`Field '${field}' must be one of: ${allowedValues.join(', ')}`, field);
  }
}

// Validate JSON schema structure
export function validateJsonSchema(schema: any): void {
  if (!schema || typeof schema !== 'object') {
    throw new ValidationError('inputSchema must be an object');
  }

  if (schema.type !== 'object') {
    throw new ValidationError('inputSchema.type must be "object"');
  }

  if (!schema.properties || typeof schema.properties !== 'object') {
    throw new ValidationError('inputSchema.properties must be an object');
  }

  if (schema.required && !Array.isArray(schema.required)) {
    throw new ValidationError('inputSchema.required must be an array');
  }
}

// Sanitize string for DynamoDB
export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

// Convert DynamoDB item to plain object (remove DynamoDB types)
export function unmarshallItem<T>(item: any): T {
  // This is a simplified version - in real implementation, use AWS SDK's unmarshall
  return item as T;
}

// Convert plain object to DynamoDB item format
export function marshallItem(item: any): any {
  // This is a simplified version - in real implementation, use AWS SDK's marshall
  return item;
}

// Check if string is valid UUID format
export function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 8 && id.length <= 50;
}

// Validate AWS region
export function validateAwsRegion(region: string): void {
  const validRegions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
    'ap-south-1', 'sa-east-1', 'ca-central-1'
  ];
  
  if (!validRegions.includes(region)) {
    throw new ValidationError(`Invalid AWS region: ${region}`);
  }
}

// Validate model ID
export function validateModelId(modelId: string): void {
  const validModels = [
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'anthropic.claude-3-opus-20240229-v1:0',
    'anthropic.claude-v2:1',
    'anthropic.claude-v2',
    'anthropic.claude-instant-v1'
  ];
  
  if (!validModels.includes(modelId)) {
    throw new ValidationError(`Invalid model ID: ${modelId}`);
  }
}

// Environment variable key validation
export function validateEnvironmentKey(key: string): void {
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
    throw new ValidationError('Environment variable key must start with a letter and contain only uppercase letters, numbers, and underscores');
  }
  
  if (key.length > 100) {
    throw new ValidationError('Environment variable key must be 100 characters or less');
  }
}