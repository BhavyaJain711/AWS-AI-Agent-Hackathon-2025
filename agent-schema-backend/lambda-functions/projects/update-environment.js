const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);

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

function validateEnvironment(environment) {
    if (typeof environment !== 'object' || environment === null || Array.isArray(environment)) {
        return { valid: false, errors: [{ field: 'environment', message: 'Environment must be an object' }] };
    }
    
    const errors = [];
    const keys = Object.keys(environment);
    
    if (keys.length > 100) {
        return { valid: false, errors: [{ field: 'environment', message: 'Maximum 100 environment variables allowed' }] };
    }
    
    keys.forEach(key => {
        // Validate key is a valid environment variable name
        if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
            errors.push({ field: `environment.${key}`, message: `Invalid environment variable name: ${key}` });
        }
        
        // Validate value is a string
        if (typeof environment[key] !== 'string') {
            errors.push({ field: `environment.${key}`, message: 'Environment variable value must be a string' });
        }
    });
    
    return {
        valid: errors.length === 0,
        errors
    };
}

exports.handler = async (event) => {
    try {
        const userId = getUserId(event);
        const projectId = event.pathParameters?.projectId;
        
        if (!projectId) {
            return createResponse(400, undefined, 'Project ID is required');
        }
        
        if (!process.env.PROJECTS_TABLE) {
            throw new Error('PROJECTS_TABLE environment variable is not set');
        }
        
        const requestBody = parseBody(event.body);
        const environment = requestBody.environment;
        
        // Validate environment object
        const validation = validateEnvironment(environment);
        if (!validation.valid) {
            return createResponse(400, undefined, {
                message: 'Validation failed',
                details: validation.errors
            });
        }
        
        const timestamp = new Date().toISOString();
        
        const updateParams = {
            TableName: process.env.PROJECTS_TABLE,
            Key: {
                userId: userId,
                projectId: projectId
            },
            UpdateExpression: 'SET config.environment = :environment, updatedAt = :timestamp',
            ExpressionAttributeValues: {
                ':environment': environment,
                ':timestamp': timestamp
            },
            ReturnValues: 'ALL_NEW'
        };
        
        const result = await dynamoDb.send(new UpdateCommand(updateParams));
        
        return createResponse(200, {
            success: true,
            updatedAt: timestamp,
            project: result.Attributes
        });
        
    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('required')) {
            return createResponse(400, undefined, error.message);
        }
        return createResponse(500, undefined, 'Internal server error');
    }
};
