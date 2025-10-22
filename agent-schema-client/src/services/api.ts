import authAxios from './authAxios';
import { 
  type Project, 
  type CreateProjectRequest, 
  type ListResponse, 
  type APIResponse,
  type ProjectItem,
  type UpdateAgentsRequest,
  type UpdateToolsRequest,
  type UpdateEnvironmentRequest,
  type UpdateMainAgentRequest,
  type SectionUpdateResponse
} from '@/types';

// HTTP client class using axios
class ApiClient {
  // GET request
  async get<T>(endpoint: string): Promise<APIResponse<T>> {
    try {
      const response = await authAxios.get(endpoint);
      return response.data;
    } catch (error: any) {
      console.error('API GET request failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error occurred',
      };
    }
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    try {
      const response = await authAxios.post(endpoint, data);
      return response.data;
    } catch (error: any) {
      console.error('API POST request failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error occurred',
      };
    }
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    try {
      const response = await authAxios.put(endpoint, data);
      return response.data;
    } catch (error: any) {
      console.error('API PUT request failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error occurred',
      };
    }
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<APIResponse<T>> {
    try {
      const response = await authAxios.delete(endpoint);
      return response.data;
    } catch (error: any) {
      console.error('API DELETE request failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error occurred',
      };
    }
  }
}

// Create and export API client instance
export const apiClient = new ApiClient();

// Specific API service functions
export const projectsApi = {
  // List projects - returns only metadata (id, name, description, timestamps)
  list: () => apiClient.get<ListResponse<Project>>('/projects'),
  
  // Create project - initializes with empty config structure
  create: (project: CreateProjectRequest) => apiClient.post<ProjectItem>('/projects', project),
  
  // Get project - returns complete configuration including main_agent, agents, tools, environment
  get: (id: string) => apiClient.get<ProjectItem>(`/projects/${id}`),
  
  // Delete project
  delete: (id: string) => apiClient.delete<void>(`/projects/${id}`),
  
  // Section-specific update methods for the new simplified architecture
  updateAgents: (id: string, request: UpdateAgentsRequest) => 
    apiClient.put<SectionUpdateResponse>(`/projects/${id}/agents`, request),
  
  updateTools: (id: string, request: UpdateToolsRequest) => 
    apiClient.put<SectionUpdateResponse>(`/projects/${id}/tools`, request),
  
  updateEnvironment: (id: string, request: UpdateEnvironmentRequest) => 
    apiClient.put<SectionUpdateResponse>(`/projects/${id}/environment`, request),
  
  updateMainAgent: (id: string, request: UpdateMainAgentRequest) => 
    apiClient.put<SectionUpdateResponse>(`/projects/${id}/main-agent`, request),
};

// Built-in tools API (still needed for listing available built-in tools)
export const builtinToolsApi = {
  list: () => apiClient.get('/builtin-tools'),
};

// Deployment API (still needed for deployment functionality)
export const deploymentApi = {
  create: (projectId: string, deployment: any) => 
    apiClient.post(`/projects/${projectId}/deployments`, deployment),
};

// ============================================================================
// DEPRECATED APIs - These are kept for backward compatibility during migration
// but should not be used in new code. Use projectsApi section updates instead.
// ============================================================================

/**
 * @deprecated Use projectsApi.get() to fetch full config, then manage state locally
 * Individual agent CRUD operations are replaced by projectsApi.updateAgents()
 */
export const agentsApi = {
  list: (projectId: string) => apiClient.get(`/projects/${projectId}/agents`),
  create: (projectId: string, agent: any) => apiClient.post(`/projects/${projectId}/agents`, agent),
  get: (projectId: string, agentId: string) => apiClient.get(`/projects/${projectId}/agents/${agentId}`),
  update: (projectId: string, agentId: string, agent: any) => 
    apiClient.put(`/projects/${projectId}/agents/${agentId}`, agent),
  delete: (projectId: string, agentId: string) => 
    apiClient.delete(`/projects/${projectId}/agents/${agentId}`),
};

/**
 * @deprecated Use projectsApi.get() to fetch full config, then manage state locally
 * Individual tool CRUD operations are replaced by projectsApi.updateTools()
 */
export const toolsApi = {
  list: (projectId: string) => apiClient.get(`/projects/${projectId}/tools`),
  create: (projectId: string, tool: any) => apiClient.post(`/projects/${projectId}/tools`, tool),
  get: (projectId: string, toolId: string) => apiClient.get(`/projects/${projectId}/tools/${toolId}`),
  update: (projectId: string, toolId: string, tool: any) => 
    apiClient.put(`/projects/${projectId}/tools/${toolId}`, tool),
  delete: (projectId: string, toolId: string) => 
    apiClient.delete(`/projects/${projectId}/tools/${toolId}`),
  listBuiltin: () => apiClient.get('/builtin-tools'),
};

/**
 * @deprecated Use projectsApi.updateMainAgent() instead
 */
export const configApi = {
  get: (projectId: string) => apiClient.get(`/projects/${projectId}/config/main`),
  update: (projectId: string, config: any) => apiClient.put(`/projects/${projectId}/config/main`, config),
};

/**
 * @deprecated Use projectsApi.updateEnvironment() instead
 */
export const environmentApi = {
  list: (projectId: string) => apiClient.get(`/projects/${projectId}/environment`),
  set: (projectId: string, envVar: any) => apiClient.post(`/projects/${projectId}/environment`, envVar),
};