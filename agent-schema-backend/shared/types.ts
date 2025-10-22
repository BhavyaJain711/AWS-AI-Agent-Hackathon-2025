// Shared TypeScript types for the Multi-Agent Management System

export interface Project {
  userId: string;
  projectId: string;
  name: string;
  description: string;
  agentIds: string[];
  toolIds: string[];
  mainAgentConfig: string;
  envIds: string[];
  deploymentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  userId: string;
  agentId: string;
  projectId: string;
  name: string;
  config: AgentConfig;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  name: string;
  description: string;
  type: 'agent_tool';
  system_prompt: string;
  tools: string[];
  builtin_tools: string[];
  model: {
    region: string;
    model_id: string;
  };
}

export interface Tool {
  userId: string;
  toolId: string;
  projectId: string;
  name: string;
  config: ToolConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ToolConfig {
  name: string;
  description: string;
  type: 'frontend_action' | 'code';
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  code?: string; // For code tools only
}

export interface MainAgentConfig {
  userId: string;
  configId: string; // Format: "project-{projectId}"
  projectId: string;
  config: MainAgentConfigData;
  createdAt: string;
  updatedAt: string;
}

export interface MainAgentConfigData {
  name: string;
  description: string;
  system_prompt: string;
  model: {
    region: string;
    model_id: string;
  };
}

export interface EnvironmentVariable {
  userId: string;
  envId: string; // Format: "project-{projectId}-{key}"
  projectId: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  userId: string;
  deploymentId: string;
  projectId: string;
  status: 'pending' | 'deploying' | 'success' | 'failed';
  config: SystemConfig;
  error?: string;
  logs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BuiltinTool {
  toolName: string;
  description: string;
  type: 'frontend_action' | 'code';
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  category: string;
  isActive: boolean;
}

// System Configuration (for deployment)
export interface SystemConfig {
  main_agent: {
    name: string;
    description: string;
    system_prompt: string;
    model: {
      region: string;
      model_id: string;
    };
  };
  agents: {
    name: string;
    description: string;
    builtin_tools: string[];
    type: 'agent_tool';
    system_prompt: string;
    tools: string[];
  }[];
  tools: {
    name: string;
    description: string;
    type: 'frontend_action' | 'code';
    inputSchema: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  }[];
  environment: Record<string, string>;
}

// API Request/Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ListResponse<T> {
  items: T[];
  count: number;
  lastEvaluatedKey?: Record<string, any>;
}

// Lambda Event types
export interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  pathParameters: Record<string, string> | null;
  queryStringParameters: Record<string, string> | null;
  headers: Record<string, string>;
  body: string | null;
  requestContext: {
    authorizer: {
      claims: {
        sub: string;
        email: string;
        [key: string]: string;
      };
    };
  };
}

export interface LambdaContext {
  requestId: string;
  functionName: string;
  functionVersion: string;
  logGroupName: string;
  logStreamName: string;
  memoryLimitInMB: string;
  getRemainingTimeInMillis(): number;
}

// Validation schemas
export interface CreateProjectRequest {
  name: string;
  description: string;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  projectId: string;
}

export interface CreateAgentRequest {
  projectId: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  builtinTools: string[];
  model: {
    region: string;
    model_id: string;
  };
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {
  agentId: string;
}

export interface CreateToolRequest {
  projectId: string;
  name: string;
  description: string;
  type: 'frontend_action' | 'code';
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  code?: string;
}

export interface UpdateToolRequest extends Partial<CreateToolRequest> {
  toolId: string;
}

export interface UpdateMainConfigRequest {
  projectId: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: {
    region: string;
    model_id: string;
  };
}

export interface SetEnvironmentVariableRequest {
  projectId: string;
  key: string;
  value: string;
}

export interface CreateDeploymentRequest {
  projectId: string;
}

// Error types
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}