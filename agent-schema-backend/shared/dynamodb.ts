// DynamoDB helper functions and configuration

declare const process: {
    env: Record<string, string | undefined>;
};

export const TABLE_NAMES = {
    PROJECTS: process.env.PROJECTS_TABLE || 'multi-agent-projects-dev',
    AGENTS: process.env.AGENTS_TABLE || 'multi-agent-agents-dev',
    TOOLS: process.env.TOOLS_TABLE || 'multi-agent-tools-dev',
    MAIN_CONFIG: process.env.MAIN_CONFIG_TABLE || 'multi-agent-main-config-dev',
    ENVIRONMENT: process.env.ENVIRONMENT_TABLE || 'multi-agent-environment-dev',
    DEPLOYMENTS: process.env.DEPLOYMENTS_TABLE || 'multi-agent-deployments-dev',
    BUILTIN_TOOLS: process.env.BUILTIN_TOOLS_TABLE || 'multi-agent-builtin-tools-dev',
} as const;

// No GSI indexes are required for the current use case
export const GSI_NAMES = {
    // Reserved for future use if needed
} as const;

// DynamoDB client configuration
export const dynamoDbConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    // Add other configuration as needed
};

// Project-specific helper functions
export function buildProjectResourceKey(projectId: string, resourceType: 'main-config' | 'env', resourceKey?: string): string {
    if (resourceType === 'main-config') {
        return `project-${projectId}`;
    }
    if (resourceType === 'env' && resourceKey) {
        return `project-${projectId}-${resourceKey}`;
    }
    throw new Error('Invalid resource type or missing resource key');
}

// Filter helper for project-scoped queries
export function addProjectFilter(
    params: QueryParams,
    projectId: string
): QueryParams {
    const builder = new ExpressionBuilder();
    const projectIdPlaceholder = builder.addName('projectId');
    const projectIdValuePlaceholder = builder.addValue(projectId);

    return {
        ...params,
        FilterExpression: `${projectIdPlaceholder} = ${projectIdValuePlaceholder}`,
        ExpressionAttributeNames: {
            ...params.ExpressionAttributeNames,
            ...builder.getNames(),
        },
        ExpressionAttributeValues: {
            ...params.ExpressionAttributeValues,
            ...builder.getValues(),
        },
    };
}

// Common DynamoDB operations
export interface QueryParams {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, any>;
    FilterExpression?: string;
    IndexName?: string;
    ScanIndexForward?: boolean;
    Limit?: number;
    ExclusiveStartKey?: Record<string, any>;
}

export interface PutParams {
    TableName: string;
    Item: Record<string, any>;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, any>;
}

export interface UpdateParams {
    TableName: string;
    Key: Record<string, any>;
    UpdateExpression: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, any>;
    ConditionExpression?: string;
    ReturnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
}

export interface DeleteParams {
    TableName: string;
    Key: Record<string, any>;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, any>;
}

export interface GetParams {
    TableName: string;
    Key: Record<string, any>;
    ProjectionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
}

// Helper functions for building DynamoDB expressions
export class ExpressionBuilder {
    private names: Record<string, string> = {};
    private values: Record<string, any> = {};
    private nameCounter = 0;
    private valueCounter = 0;

    addName(name: string): string {
        const placeholder = `#n${this.nameCounter++}`;
        this.names[placeholder] = name;
        return placeholder;
    }

    addValue(value: any): string {
        const placeholder = `:v${this.valueCounter++}`;
        this.values[placeholder] = value;
        return placeholder;
    }

    getNames(): Record<string, string> {
        return this.names;
    }

    getValues(): Record<string, any> {
        return this.values;
    }

    hasNames(): boolean {
        return Object.keys(this.names).length > 0;
    }

    hasValues(): boolean {
        return Object.keys(this.values).length > 0;
    }
}

// Common query builders
export function buildGetItemParams(tableName: string, key: Record<string, any>): GetParams {
    return {
        TableName: tableName,
        Key: key,
    };
}

export function buildQueryByPartitionKey(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: any,
    options: {
        sortKeyCondition?: { name: string; operator: string; value: any };
        indexName?: string;
        limit?: number;
        scanIndexForward?: boolean;
    } = {}
): QueryParams {
    const builder = new ExpressionBuilder();
    const pkPlaceholder = builder.addName(partitionKeyName);
    const pkValuePlaceholder = builder.addValue(partitionKeyValue);

    let keyConditionExpression = `${pkPlaceholder} = ${pkValuePlaceholder}`;

    if (options.sortKeyCondition) {
        const skPlaceholder = builder.addName(options.sortKeyCondition.name);
        const skValuePlaceholder = builder.addValue(options.sortKeyCondition.value);
        keyConditionExpression += ` AND ${skPlaceholder} ${options.sortKeyCondition.operator} ${skValuePlaceholder}`;
    }

    const params: QueryParams = {
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
    };

    if (builder.hasNames()) {
        params.ExpressionAttributeNames = builder.getNames();
    }

    if (builder.hasValues()) {
        params.ExpressionAttributeValues = builder.getValues();
    }

    if (options.indexName) {
        params.IndexName = options.indexName;
    }

    if (options.limit) {
        params.Limit = options.limit;
    }

    if (options.scanIndexForward !== undefined) {
        params.ScanIndexForward = options.scanIndexForward;
    }

    return params;
}

export function buildPutItemParams(
    tableName: string,
    item: Record<string, any>,
    options: {
        conditionExpression?: string;
        expressionAttributeNames?: Record<string, string>;
        expressionAttributeValues?: Record<string, any>;
    } = {}
): PutParams {
    const params: PutParams = {
        TableName: tableName,
        Item: item,
    };

    if (options.conditionExpression) {
        params.ConditionExpression = options.conditionExpression;
    }

    if (options.expressionAttributeNames) {
        params.ExpressionAttributeNames = options.expressionAttributeNames;
    }

    if (options.expressionAttributeValues) {
        params.ExpressionAttributeValues = options.expressionAttributeValues;
    }

    return params;
}

export function buildUpdateItemParams(
    tableName: string,
    key: Record<string, any>,
    updates: Record<string, any>,
    options: {
        conditionExpression?: string;
    } = {}
): UpdateParams {
    const builder = new ExpressionBuilder();
    const updateExpressions: string[] = [];

    for (const [field, value] of Object.entries(updates)) {
        const namePlaceholder = builder.addName(field);
        const valuePlaceholder = builder.addValue(value);
        updateExpressions.push(`${namePlaceholder} = ${valuePlaceholder}`);
    }

    const params: UpdateParams = {
        TableName: tableName,
        Key: key,
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ReturnValues: 'ALL_NEW',
    };

    if (builder.hasNames()) {
        params.ExpressionAttributeNames = builder.getNames();
    }

    if (builder.hasValues()) {
        params.ExpressionAttributeValues = builder.getValues();
    }

    if (options.conditionExpression) {
        params.ConditionExpression = options.conditionExpression;
    }

    return params;
}

export function buildDeleteItemParams(
    tableName: string,
    key: Record<string, any>,
    options: {
        conditionExpression?: string;
    } = {}
): DeleteParams {
    const params: DeleteParams = {
        TableName: tableName,
        Key: key,
    };

    if (options.conditionExpression) {
        params.ConditionExpression = options.conditionExpression;
    }

    return params;
}

// Project-specific query builders
export function buildProjectResourcesQuery(
    tableName: string,
    userId: string,
    projectId: string,
    options: {
        limit?: number;
        scanIndexForward?: boolean;
    } = {}
): QueryParams {
    const baseQuery = buildQueryByPartitionKey(tableName, 'userId', userId, options);
    return addProjectFilter(baseQuery, projectId);
}

// Helper to update project resource arrays
export function buildUpdateProjectResourcesParams(
    projectId: string,
    userId: string,
    updates: {
        addAgentId?: string;
        removeAgentId?: string;
        addToolId?: string;
        removeToolId?: string;
        addEnvId?: string;
        removeEnvId?: string;
        addDeploymentId?: string;
        removeDeploymentId?: string;
    }
): UpdateParams {
    const builder = new ExpressionBuilder();
    const updateExpressions: string[] = [];
    const key = { userId, projectId };

    // Handle array additions
    if (updates.addAgentId) {
        const agentIdsPlaceholder = builder.addName('agentIds');
        const agentIdValuePlaceholder = builder.addValue([updates.addAgentId]);
        updateExpressions.push(`${agentIdsPlaceholder} = list_append(if_not_exists(${agentIdsPlaceholder}, :empty_list), ${agentIdValuePlaceholder})`);
        builder.addValue([]);
    }

    if (updates.addToolId) {
        const toolIdsPlaceholder = builder.addName('toolIds');
        const toolIdValuePlaceholder = builder.addValue([updates.addToolId]);
        updateExpressions.push(`${toolIdsPlaceholder} = list_append(if_not_exists(${toolIdsPlaceholder}, :empty_list), ${toolIdValuePlaceholder})`);
    }

    if (updates.addEnvId) {
        const envIdsPlaceholder = builder.addName('envIds');
        const envIdValuePlaceholder = builder.addValue([updates.addEnvId]);
        updateExpressions.push(`${envIdsPlaceholder} = list_append(if_not_exists(${envIdsPlaceholder}, :empty_list), ${envIdValuePlaceholder})`);
    }

    if (updates.addDeploymentId) {
        const deploymentIdsPlaceholder = builder.addName('deploymentIds');
        const deploymentIdValuePlaceholder = builder.addValue([updates.addDeploymentId]);
        updateExpressions.push(`${deploymentIdsPlaceholder} = list_append(if_not_exists(${deploymentIdsPlaceholder}, :empty_list), ${deploymentIdValuePlaceholder})`);
    }

    // Add updatedAt timestamp
    const updatedAtPlaceholder = builder.addName('updatedAt');
    const timestampPlaceholder = builder.addValue(new Date().toISOString());
    updateExpressions.push(`${updatedAtPlaceholder} = ${timestampPlaceholder}`);

    return {
        TableName: TABLE_NAMES.PROJECTS,
        Key: key,
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: builder.getNames(),
        ExpressionAttributeValues: {
            ...builder.getValues(),
            ':empty_list': [],
        },
        ReturnValues: 'ALL_NEW',
    };
}