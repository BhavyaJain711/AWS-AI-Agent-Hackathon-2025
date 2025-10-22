// Types for the new simplified config architecture

export interface ModelConfig {
  region: string;
  model_id: string;
}

export interface ConfigMainAgent {
  name: string;
  description: string;
  system_prompt: string;
  model: ModelConfig;
}

export interface ConfigAgent {
  name: string;
  description: string;
  type: 'agent_tool';
  system_prompt: string;
  tools: string[];
  builtin_tools: string[];
  agent_tools?: string[];
  model: ModelConfig;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ConfigTool {
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

export interface ProjectConfig {
  main_agent: ConfigMainAgent;
  agents: ConfigAgent[];
  tools: ConfigTool[];
  environment: Record<string, string>;
}

export interface ProjectItem {
  userId: string;
  projectId: string;
  name: string;
  description: string;
  config: ProjectConfig;
  createdAt: string;
  updatedAt: string;
}

// API request types for section updates
export interface UpdateAgentsRequest {
  agents: ConfigAgent[];
}

export interface UpdateToolsRequest {
  tools: ConfigTool[];
}

export interface UpdateEnvironmentRequest {
  environment: Record<string, string>;
}

export interface UpdateMainAgentRequest {
  mainAgent: ConfigMainAgent;
}

// API response types
export interface SectionUpdateResponse {
  success: boolean;
  updatedAt: string;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}
