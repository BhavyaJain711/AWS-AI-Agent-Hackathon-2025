import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { type CreateAgentRequest, type ConfigAgent } from '@/types';
import { AgentList, AgentForm } from '@/components/agents';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

export const Agents = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [showForm, setShowForm] = useState(false);
  const [editingAgentName, setEditingAgentName] = useState<string | null>(null);

  // Get agents from the project config store
  const { project, loading, addAgent, updateAgent, deleteAgent, loadProject, savingAgents } = useProjectConfigStore();
  const agents = project?.config.agents || [];

  // Load project on component mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // Convert ConfigAgent to legacy Agent format for display
  const convertToLegacyAgent = (configAgent: ConfigAgent): any => ({
    id: configAgent.name,
    name: configAgent.name,
    description: configAgent.description,
    type: configAgent.type,
    systemPrompt: configAgent.system_prompt,
    tools: configAgent.tools,
    builtinTools: configAgent.builtin_tools,
    model: configAgent.model,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const projectAgents = agents.map(convertToLegacyAgent);
  const loadingAgents = loading;
  const editingAgent = editingAgentName ? agents.find(a => a.name === editingAgentName) : null;

  const handleEditAgent = (legacyAgent: any) => {
    setEditingAgentName(legacyAgent.name);
    setShowForm(true);
  };

  const handleDeleteAgent = async (legacyAgent: any) => {
    if (!projectId) return;
    
    if (window.confirm(`Are you sure you want to delete "${legacyAgent.name}"?`)) {
      deleteAgent(legacyAgent.name);
      // Save changes immediately
      await useProjectConfigStore.getState().saveAgents(projectId);
    }
  };

  const handleCreateAgent = () => {
    setEditingAgentName(null);
    setShowForm(true);
  };

  const handleSaveAgent = async (agentData: CreateAgentRequest) => {
    if (!projectId) return;
    
    // Convert CreateAgentRequest to ConfigAgent
    const configAgent: ConfigAgent = {
      name: agentData.name,
      description: agentData.description,
      type: 'agent_tool',
      system_prompt: agentData.systemPrompt,
      tools: agentData.tools,
      builtin_tools: agentData.builtinTools,
      agent_tools: [], // Will be populated from builtinTools if needed
      model: agentData.model,
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    };
    
    if (editingAgentName) {
      // Update existing agent
      updateAgent(editingAgentName, configAgent);
    } else {
      // Create new agent
      addAgent(configAgent);
    }
    
    // Save changes to backend
    const success = await useProjectConfigStore.getState().saveAgents(projectId);
    
    if (success) {
      setShowForm(false);
      setEditingAgentName(null);
    } else {
      // TODO: Show error toast
      console.error('Failed to save agent');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAgentName(null);
  };

  return (
    <div className="p-6">
      {!showForm ? (
        <>
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Agents</h1>
                <p className="text-muted-foreground">
                  Create and manage AI agents with custom tools and configurations.
                </p>
              </div>
              <button 
                onClick={handleCreateAgent}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Create Agent
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-card rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Total Agents</h3>
                <div className="text-2xl font-bold text-primary">{projectAgents.length}</div>
                <p className="text-sm text-muted-foreground">In this project</p>
              </div>

              <div className="p-6 bg-card rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Custom Tools Used</h3>
                <div className="text-2xl font-bold text-secondary">
                  {projectAgents.reduce((sum, a) => sum + (a.tools?.length || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground">Across all agents</p>
              </div>

              <div className="p-6 bg-card rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Built-in Tools Used</h3>
                <div className="text-2xl font-bold text-accent">
                  {projectAgents.reduce((sum, a) => sum + (a.builtinTools?.length || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground">System tools in use</p>
              </div>
            </div>
          </div>

          {/* Agent List */}
          <AgentList
            agents={projectAgents}
            isLoading={loadingAgents}
            onEdit={handleEditAgent}
            onDelete={handleDeleteAgent}
          />
        </>
      ) : (
        <AgentForm
          agent={editingAgent ? {
            userId: 'user',
            agentId: editingAgent.name,
            projectId: projectId!,
            name: editingAgent.name,
            config: editingAgent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } : undefined}
          onSave={handleSaveAgent}
          onCancel={handleCancelForm}
          isLoading={savingAgents}
        />
      )}
    </div>
  );
};