/**
 * Built-in tools available to all agents
 * Add new tools here - no backend changes required
 * 
 * Format: { toolName: string, description: string }
 */
export interface BuiltinToolDefinition {
    toolName: string;
    description: string;
    category?: string;
}

export const BUILTIN_TOOLS: BuiltinToolDefinition[] = [
    {
        toolName: 'web-search',
        description: 'Search the web for information using various search engines',
        category: 'Information',
    },
    {
        toolName: 'calculator',
        description: 'Perform mathematical calculations and evaluate expressions',
        category: 'Utilities',
    },
    {
        toolName: 'file-manager',
        description: 'Manage files and directories (read, write, list, delete)',
        category: 'System',
    },
    {
        toolName: 'http-request',
        description: 'Make HTTP requests to external APIs',
        category: 'Integration',
    },
    {
        toolName: 'database-query',
        description: 'Execute database queries (SQL)',
        category: 'Data',
    },
    {
        toolName: 'email-sender',
        description: 'Send emails via SMTP',
        category: 'Communication',
    },
    {
        toolName: 'json-parser',
        description: 'Parse and manipulate JSON data',
        category: 'Utilities',
    },
    {
        toolName: 'text-processor',
        description: 'Process and transform text (regex, replace, split, etc.)',
        category: 'Utilities',
    },
    {
        toolName: 'date-time',
        description: 'Work with dates and times (format, parse, calculate)',
        category: 'Utilities',
    },
    {
        toolName: 'image-processor',
        description: 'Process and manipulate images (resize, crop, convert)',
        category: 'Media',
    },
    {
        toolName: 'pdf-generator',
        description: 'Generate PDF documents from HTML or templates',
        category: 'Media',
    },
    {
        toolName: 'csv-parser',
        description: 'Parse and manipulate CSV files',
        category: 'Data',
    },
    {
        toolName: 'xml-parser',
        description: 'Parse and manipulate XML data',
        category: 'Data',
    },
    {
        toolName: 'code-executor',
        description: 'Execute code snippets in various languages',
        category: 'Development',
    },
    {
        toolName: 'slack-messenger',
        description: 'Send messages to Slack channels',
        category: 'Communication',
    },
    {
        toolName: 'github-api',
        description: 'Interact with GitHub repositories and issues',
        category: 'Integration',
    },
    {
        toolName: 'aws-s3',
        description: 'Upload and download files from AWS S3',
        category: 'Storage',
    },
    {
        toolName: 'redis-cache',
        description: 'Store and retrieve data from Redis cache',
        category: 'Data',
    },
    {
        toolName:'current-time',
        description: 'Get the current time',
        category: 'Utilities',
    }
];

/**
 * Get all builtin tool names as an array of strings
 * This is what gets stored in the builtin_tools array
 */
export const getBuiltinToolNames = (): string[] => {
    return BUILTIN_TOOLS.map(tool => tool.toolName);
};

/**
 * Get builtin tools by category
 */
export const getBuiltinToolsByCategory = (category: string): BuiltinToolDefinition[] => {
    return BUILTIN_TOOLS.filter(tool => tool.category === category);
};

/**
 * Get all unique categories
 */
export const getBuiltinToolCategories = (): string[] => {
    return Array.from(new Set(BUILTIN_TOOLS.map(tool => tool.category).filter(Boolean))) as string[];
};

/**
 * Find a builtin tool by name
 */
export const findBuiltinTool = (toolName: string): BuiltinToolDefinition | undefined => {
    return BUILTIN_TOOLS.find(tool => tool.toolName === toolName);
};
