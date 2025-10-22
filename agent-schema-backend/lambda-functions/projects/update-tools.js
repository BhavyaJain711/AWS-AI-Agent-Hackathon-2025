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

function validateTool(tool, index) {
    const errors = [];
    
    if (!tool.name || typeof tool.name !== 'string') {
        errors.push({ field: `tools[${index}].name`, message: 'Name is required and must be a string' });
    }
    
    if (!tool.description || typeof tool.description !== 'string') {
        errors.push({ field: `tools[${index}].description`, message: 'Description is required and must be a string' });
    }
    
    if (!tool.type || typeof tool.type !== 'string') {
        errors.push({ field: `tools[${index}].type`, message: 'Type is required and must be a string' });
    }
    
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
        errors.push({ field: `tools[${index}].inputSchema`, message: 'Input schema is required and must be an object' });
    }
    
    return errors;
}

function validateTools(tools) {
    if (!Array.isArray(tools)) {
        return { valid: false, errors: [{ field: 'tools', message: 'Tools must be an array' }] };
    }
    
    if (tools.length > 100) {
        return { valid: false, errors: [{ field: 'tools', message: 'Maximum 100 tools allowed' }] };
    }
    
    const errors = [];
    const names = new Set();
    
    tools.forEach((tool, index) => {
        // Validate structure
        const toolErrors = validateTool(tool, index);
        errors.push(...toolErrors);
        
        // Check for duplicate names
        if (tool.name) {
            if (names.has(tool.name)) {
                errors.push({ field: `tools[${index}].name`, message: `Duplicate tool name: ${tool.name}` });
            }
            names.add(tool.name);
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
        const tools = requestBody.tools;
        
        // Validate tools array
        const validation = validateTools(tools);
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
            UpdateExpression: 'SET config.tools = :tools, updatedAt = :timestamp',
            ExpressionAttributeValues: {
                ':tools': tools,
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
