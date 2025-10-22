import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { type CreateToolRequest, type ConfigTool } from '@/types';
import { ToolList, ToolForm } from '@/components/tools';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { BUILTIN_TOOLS } from '@/constants/builtinTools';

export const Tools = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [showForm, setShowForm] = useState(false);
  const [editingToolName, setEditingToolName] = useState<string | null>(null);

  // Get tools from the project config store
  const { project, loading, addTool, updateTool, deleteTool, loadProject, savingTools } = useProjectConfigStore();
  const tools = project?.config.tools || [];
  
  // Get builtin tools from constants
  const builtinTools = BUILTIN_TOOLS;

  // Load project on component mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // Convert ConfigTool to legacy Tool format for display
  const convertToLegacyTool = (configTool: ConfigTool, isBuiltin: boolean = false) => ({
    id: configTool.name,
    name: configTool.name,
    description: configTool.description,
    type: configTool.type,
    inputSchema: configTool.inputSchema,
    code: configTool.code,
    isBuiltin,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const allTools = [
    ...tools.map(t => convertToLegacyTool(t, false)),
    ...builtinTools.map(bt => ({
      id: bt.toolName,
      name: bt.toolName,
      description: bt.description,
      type: 'code' as const, // Default type for display purposes
      inputSchema: { type: 'object' as const, properties: {} },
      code: undefined,
      isBuiltin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  ];

  const handleEditTool = (legacyTool: any) => {
    if (legacyTool.isBuiltin) {
      // Built-in tools cannot be edited
      return;
    }
    setEditingToolName(legacyTool.name);
    setShowForm(true);
  };

  const handleDeleteTool = async (legacyTool: any) => {
    if (legacyTool.isBuiltin || !projectId) {
      // Built-in tools cannot be deleted
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${legacyTool.name}"?`)) {
      deleteTool(legacyTool.name);
      // Save changes immediately
      await useProjectConfigStore.getState().saveTools(projectId);
    }
  };

  const handleCreateTool = () => {
    setEditingToolName(null);
    setShowForm(true);
  };

  const handleSaveTool = async (toolData: CreateToolRequest) => {
    if (!projectId) return;

    // Convert CreateToolRequest to ConfigTool
    const configTool: ConfigTool = {
      name: toolData.name,
      description: toolData.description,
      type: toolData.type,
      inputSchema: toolData.inputSchema,
      code: toolData.code
    };

    if (editingToolName) {
      // Update existing tool
      updateTool(editingToolName, configTool);
    } else {
      // Create new tool
      addTool(configTool);
    }

    // Save changes to backend
    const success = await useProjectConfigStore.getState().saveTools(projectId);

    if (success) {
      setShowForm(false);
      setEditingToolName(null);
    } else {
      // TODO: Show error toast
      console.error('Failed to save tool');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingToolName(null);
  };

  const customTools = tools;
  const loadingTools = loading;
  const editingTool = editingToolName ? tools.find(t => t.name === editingToolName) : null;

  return (
    <div className="p-6">
      {!showForm ? (
        <>
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Tools</h1>
                <p className="text-muted-foreground">
                  Manage custom tools and view available built-in tools for your agents.
                </p>
              </div>
              <button
                onClick={handleCreateTool}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Create Tool
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-card rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Custom Tools</h3>
                <p className="text-muted-foreground mb-4">Tools you've created</p>
                <div className="text-2xl font-bold text-primary">{customTools.length}</div>
                <p className="text-sm text-muted-foreground">Custom tools</p>
              </div>

              <div className="p-6 bg-card rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Built-in Tools</h3>
                <p className="text-muted-foreground mb-4">Available system tools</p>
                <div className="text-2xl font-bold text-secondary">{builtinTools.length}</div>
                <p className="text-sm text-muted-foreground">Built-in tools</p>
              </div>
            </div>
          </div>

          {/* Tool List */}
          <ToolList
            tools={allTools}
            isLoading={loadingTools}
            onEdit={handleEditTool}
            onDelete={handleDeleteTool}
          />
        </>
      ) : (
        /* Tool Form */
        <ToolForm
          tool={editingTool ? convertToLegacyTool(editingTool, false) : undefined}
          onSave={handleSaveTool}
          onCancel={handleCancelForm}
          isLoading={savingTools}
        />
      )}
    </div>
  );
};