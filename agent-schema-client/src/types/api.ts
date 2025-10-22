// API types for the Multi-Agent Management System
// These match the backend shared types

export interface Project {
  userId: string;
  projectId: string;
  name: string;
  description: string;
  agentIds: string[];
  toolIds: string[];
  mainAgentConfig?: string;
  envIds?: string[];
  deploymentIds?: string[];
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

// API Request types (matching backend)
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

// Legacy interfaces for backward compatibility with existing components
export interface LegacyTool {
  id: string;
  name: string;
  description: string;
  type: 'frontend_action' | 'code';
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  code?: string;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyAgent {
  id: string;
  name: string;
  description: string;
  type: 'agent_tool';
  systemPrompt: string;
  tools: string[];
  builtinTools: string[];
  model: {
    region: string;
    model_id: string;
  };
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ListResponse<T> {
  items: T[];
  count: number;
}