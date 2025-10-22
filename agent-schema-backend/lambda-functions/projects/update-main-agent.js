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

function validateMainAgent(mainAgent) {
    const errors = [];
    
    if (!mainAgent || typeof mainAgent !== 'object' || Array.isArray(mainAgent)) {
        return { valid: false, errors: [{ field: 'mainAgent', message: 'Main agent must be an object' }] };
    }
    
    if (!mainAgent.name || typeof mainAgent.name !== 'string') {
        errors.push({ field: 'mainAgent.name', message: 'Name is required and must be a string' });
    }
    
    if (!mainAgent.description || typeof mainAgent.description !== 'string') {
        errors.push({ field: 'mainAgent.description', message: 'Description is required and must be a string' });
    }
    
    if (!mainAgent.system_prompt || typeof mainAgent.system_prompt !== 'string') {
        errors.push({ field: 'mainAgent.system_prompt', message: 'System prompt is required and must be a string' });
    }
    
    if (!mainAgent.model || typeof mainAgent.model !== 'object') {
        errors.push({ field: 'mainAgent.model', message: 'Model configuration is required' });
    } else {
        if (!mainAgent.model.region || typeof mainAgent.model.region !== 'string') {
            errors.push({ field: 'mainAgent.model.region', message: 'Model region is required and must be a string' });
        }
        if (!mainAgent.model.model_id || typeof mainAgent.model.model_id !== 'string') {
            errors.push({ field: 'mainAgent.model.model_id', message: 'Model ID is required and must be a string' });
        }
    }
    
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
        const mainAgent = requestBody.mainAgent;
        
        // Validate main agent
        const validation = validateMainAgent(mainAgent);
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
            UpdateExpression: 'SET config.main_agent = :mainAgent, updatedAt = :timestamp',
            ExpressionAttributeValues: {
                ':mainAgent': mainAgent,
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
