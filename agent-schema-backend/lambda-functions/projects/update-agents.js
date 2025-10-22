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

function validateAgent(agent, index) {
    const errors = [];
    
    if (!agent.name || typeof agent.name !== 'string') {
        errors.push({ field: `agents[${index}].name`, message: 'Name is required and must be a string' });
    }
    
    if (!agent.description || typeof agent.description !== 'string') {
        errors.push({ field: `agents[${index}].description`, message: 'Description is required and must be a string' });
    }
    
    if (!agent.system_prompt || typeof agent.system_prompt !== 'string') {
        errors.push({ field: `agents[${index}].system_prompt`, message: 'System prompt is required and must be a string' });
    }
    
    if (!agent.model || typeof agent.model !== 'object') {
        errors.push({ field: `agents[${index}].model`, message: 'Model configuration is required' });
    } else {
        if (!agent.model.region || typeof agent.model.region !== 'string') {
            errors.push({ field: `agents[${index}].model.region`, message: 'Model region is required and must be a string' });
        }
        if (!agent.model.model_id || typeof agent.model.model_id !== 'string') {
            errors.push({ field: `agents[${index}].model.model_id`, message: 'Model ID is required and must be a string' });
        }
    }
    
    return errors;
}

function validateAgents(agents) {
    if (!Array.isArray(agents)) {
        return { valid: false, errors: [{ field: 'agents', message: 'Agents must be an array' }] };
    }
    
    if (agents.length > 100) {
        return { valid: false, errors: [{ field: 'agents', message: 'Maximum 100 agents allowed' }] };
    }
    
    const errors = [];
    const names = new Set();
    
    agents.forEach((agent, index) => {
        // Validate structure
        const agentErrors = validateAgent(agent, index);
        errors.push(...agentErrors);
        
        // Check for duplicate names
        if (agent.name) {
            if (names.has(agent.name)) {
                errors.push({ field: `agents[${index}].name`, message: `Duplicate agent name: ${agent.name}` });
            }
            names.add(agent.name);
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
        const agents = requestBody.agents;
        
        // Validate agents array
        const validation = validateAgents(agents);
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
            UpdateExpression: 'SET config.agents = :agents, updatedAt = :timestamp',
            ExpressionAttributeValues: {
                ':agents': agents,
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
