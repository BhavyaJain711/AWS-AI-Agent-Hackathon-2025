import { create } from 'zustand';
import { projectsApi } from '@/services/api';
import type {
  ProjectItem,
  ConfigMainAgent,
  ConfigAgent,
  ConfigTool,
} from '@/types';

interface ProjectConfigState {
  // Core state
  project: ProjectItem | null;
  loading: boolean;
  error: string | null;

  // Original saved state for each section (for discard functionality)
  savedMainAgent: ConfigMainAgent | null;
  savedAgents: ConfigAgent[];
  savedTools: ConfigTool[];
  savedEnvironment: Record<string, string>;

  // Section-specific unsaved changes tracking
  hasUnsavedAgents: boolean;
  hasUnsavedTools: boolean;
  hasUnsavedEnvironment: boolean;
  hasUnsavedMainAgent: boolean;

  // Section-specific loading states
  savingAgents: boolean;
  savingTools: boolean;
  savingEnvironment: boolean;
  savingMainAgent: boolean;

  // Section-specific error states
  agentsError: string | null;
  toolsError: string | null;
  environmentError: string | null;
  mainAgentError: string | null;

  // Actions - Project loading
  loadProject: (projectId: string) => Promise<void>;
  setProject: (project: ProjectItem) => void;
  clearProject: () => void;

  // Actions - Main Agent mutations
  updateMainAgent: (mainAgent: Partial<ConfigMainAgent>) => void;
  saveMainAgent: (projectId: string) => Promise<boolean>;
  discardMainAgent: () => void;

  // Actions - Agents mutations
  addAgent: (agent: ConfigAgent) => void;
  updateAgent: (name: string, agent: Partial<ConfigAgent>) => void;
  deleteAgent: (name: string) => void;
  saveAgents: (projectId: string) => Promise<boolean>;
  discardAgents: () => void;

  // Actions - Tools mutations
  addTool: (tool: ConfigTool) => void;
  updateTool: (name: string, tool: Partial<ConfigTool>) => void;
  deleteTool: (name: string) => void;
  saveTools: (projectId: string) => Promise<boolean>;
  discardTools: () => void;

  // Actions - Environment mutations
  setEnvironmentVar: (key: string, value: string) => void;
  deleteEnvironmentVar: (key: string) => void;
  saveEnvironment: (projectId: string) => Promise<boolean>;
  discardEnvironment: () => void;

  // Utility actions
  refresh: (projectId: string) => Promise<void>;
}

export const useProjectConfigStore = create<ProjectConfigState>((set, get) => ({
  // Initial state
  project: null,
  loading: false,
  error: null,

  savedMainAgent: null,
  savedAgents: [],
  savedTools: [],
  savedEnvironment: {},

  hasUnsavedAgents: false,
  hasUnsavedTools: false,
  hasUnsavedEnvironment: false,
  hasUnsavedMainAgent: false,

  savingAgents: false,
  savingTools: false,
  savingEnvironment: false,
  savingMainAgent: false,

  agentsError: null,
  toolsError: null,
  environmentError: null,
  mainAgentError: null,

  // Load project from API
  loadProject: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await projectsApi.get(projectId);
      
      if (response.success && response.data) {
        const project = response.data;
        set({
          project,
          savedMainAgent: { ...project.config.main_agent },
          savedAgents: JSON.parse(JSON.stringify(project.config.agents)),
          savedTools: JSON.parse(JSON.stringify(project.config.tools)),
          savedEnvironment: { ...project.config.environment },
          hasUnsavedAgents: false,
          hasUnsavedTools: false,
          hasUnsavedEnvironment: false,
          hasUnsavedMainAgent: false,
          loading: false,
          error: null,
        });
      } else {
        set({
          error: response.error || 'Failed to load project',
          loading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load project',
        loading: false,
      });
    }
  },

  setProject: (project: ProjectItem) => {
    set({
      project,
      savedMainAgent: { ...project.config.main_agent },
      savedAgents: JSON.parse(JSON.stringify(project.config.agents)),
      savedTools: JSON.parse(JSON.stringify(project.config.tools)),
      savedEnvironment: { ...project.config.environment },
      hasUnsavedAgents: false,
      hasUnsavedTools: false,
      hasUnsavedEnvironment: false,
      hasUnsavedMainAgent: false,
    });
  },

  clearProject: () => {
    set({
      project: null,
      savedMainAgent: null,
      savedAgents: [],
      savedTools: [],
      savedEnvironment: {},
      hasUnsavedAgents: false,
      hasUnsavedTools: false,
      hasUnsavedEnvironment: false,
      hasUnsavedMainAgent: false,
      error: null,
    });
  },

  // Main Agent actions
  updateMainAgent: (mainAgentUpdate: Partial<ConfigMainAgent>) => {
    const { project } = get();
    if (!project) return;

    const updatedMainAgent = {
      ...project.config.main_agent,
      ...mainAgentUpdate,
    };

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          main_agent: updatedMainAgent,
        },
      },
      hasUnsavedMainAgent: true,
      mainAgentError: null,
    });
  },

  saveMainAgent: async (projectId: string) => {
    const { project } = get();
    if (!project) return false;

    set({ savingMainAgent: true, mainAgentError: null });

    try {
      const response = await projectsApi.updateMainAgent(projectId, {
        mainAgent: project.config.main_agent
      });

      if (response.success && response.data) {
        set({
          savedMainAgent: { ...project.config.main_agent },
          hasUnsavedMainAgent: false,
          savingMainAgent: false,
          mainAgentError: null,
        });
        return true;
      } else {
        set({
          mainAgentError: response.error || 'Failed to save main agent',
          savingMainAgent: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        mainAgentError: error.message || 'Failed to save main agent',
        savingMainAgent: false,
      });
      return false;
    }
  },

  discardMainAgent: () => {
    const { project, savedMainAgent } = get();
    if (!project || !savedMainAgent) return;

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          main_agent: { ...savedMainAgent },
        },
      },
      hasUnsavedMainAgent: false,
      mainAgentError: null,
    });
  },

  // Agents actions
  addAgent: (agent: ConfigAgent) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          agents: [...project.config.agents, agent],
        },
      },
      hasUnsavedAgents: true,
      agentsError: null,
    });
  },

  updateAgent: (name: string, agentUpdate: Partial<ConfigAgent>) => {
    const { project } = get();
    if (!project) return;

    const updatedAgents = project.config.agents.map((agent) =>
      agent.name === name ? { ...agent, ...agentUpdate } as ConfigAgent : agent
    );

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          agents: updatedAgents,
        },
      },
      hasUnsavedAgents: true,
      agentsError: null,
    });
  },

  deleteAgent: (name: string) => {
    const { project } = get();
    if (!project) return;

    const updatedAgents = project.config.agents.filter((agent) => agent.name !== name);

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          agents: updatedAgents,
        },
      },
      hasUnsavedAgents: true,
      agentsError: null,
    });
  },

  saveAgents: async (projectId: string) => {
    const { project } = get();
    if (!project) return false;

    set({ savingAgents: true, agentsError: null });

    try {
      const response = await projectsApi.updateAgents(projectId, {
        agents: project.config.agents
      });

      if (response.success && response.data) {
        set({
          savedAgents: JSON.parse(JSON.stringify(project.config.agents)),
          hasUnsavedAgents: false,
          savingAgents: false,
          agentsError: null,
        });
        return true;
      } else {
        set({
          agentsError: response.error || 'Failed to save agents',
          savingAgents: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        agentsError: error.message || 'Failed to save agents',
        savingAgents: false,
      });
      return false;
    }
  },

  discardAgents: () => {
    const { project, savedAgents } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          agents: JSON.parse(JSON.stringify(savedAgents)),
        },
      },
      hasUnsavedAgents: false,
      agentsError: null,
    });
  },

  // Tools actions
  addTool: (tool: ConfigTool) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          tools: [...project.config.tools, tool],
        },
      },
      hasUnsavedTools: true,
      toolsError: null,
    });
  },

  updateTool: (name: string, toolUpdate: Partial<ConfigTool>) => {
    const { project } = get();
    if (!project) return;

    const updatedTools = project.config.tools.map((tool) =>
      tool.name === name ? { ...tool, ...toolUpdate } as ConfigTool : tool
    );

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          tools: updatedTools,
        },
      },
      hasUnsavedTools: true,
      toolsError: null,
    });
  },

  deleteTool: (name: string) => {
    const { project } = get();
    if (!project) return;

    const updatedTools = project.config.tools.filter((tool) => tool.name !== name);

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          tools: updatedTools,
        },
      },
      hasUnsavedTools: true,
      toolsError: null,
    });
  },

  saveTools: async (projectId: string) => {
    const { project } = get();
    if (!project) return false;

    set({ savingTools: true, toolsError: null });

    try {
      const response = await projectsApi.updateTools(projectId, {
        tools: project.config.tools
      });

      if (response.success && response.data) {
        set({
          savedTools: JSON.parse(JSON.stringify(project.config.tools)),
          hasUnsavedTools: false,
          savingTools: false,
          toolsError: null,
        });
        return true;
      } else {
        set({
          toolsError: response.error || 'Failed to save tools',
          savingTools: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        toolsError: error.message || 'Failed to save tools',
        savingTools: false,
      });
      return false;
    }
  },

  discardTools: () => {
    const { project, savedTools } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          tools: JSON.parse(JSON.stringify(savedTools)),
        },
      },
      hasUnsavedTools: false,
      toolsError: null,
    });
  },

  // Environment actions
  setEnvironmentVar: (key: string, value: string) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          environment: {
            ...project.config.environment,
            [key]: value,
          },
        },
      },
      hasUnsavedEnvironment: true,
      environmentError: null,
    });
  },

  deleteEnvironmentVar: (key: string) => {
    const { project } = get();
    if (!project) return;

    const { [key]: _, ...remainingEnv } = project.config.environment;

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          environment: remainingEnv,
        },
      },
      hasUnsavedEnvironment: true,
      environmentError: null,
    });
  },

  saveEnvironment: async (projectId: string) => {
    const { project } = get();
    if (!project) return false;

    set({ savingEnvironment: true, environmentError: null });

    try {
      const response = await projectsApi.updateEnvironment(projectId, {
        environment: project.config.environment
      });

      if (response.success && response.data) {
        set({
          savedEnvironment: { ...project.config.environment },
          hasUnsavedEnvironment: false,
          savingEnvironment: false,
          environmentError: null,
        });
        return true;
      } else {
        set({
          environmentError: response.error || 'Failed to save environment',
          savingEnvironment: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        environmentError: error.message || 'Failed to save environment',
        savingEnvironment: false,
      });
      return false;
    }
  },

  discardEnvironment: () => {
    const { project, savedEnvironment } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        config: {
          ...project.config,
          environment: { ...savedEnvironment },
        },
      },
      hasUnsavedEnvironment: false,
      environmentError: null,
    });
  },

  // Utility actions
  refresh: async (projectId: string) => {
    await get().loadProject(projectId);
  },
}));
