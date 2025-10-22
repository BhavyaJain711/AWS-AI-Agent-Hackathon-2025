import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type ProjectItem, type ProjectConfig } from '@/types';
import { projectsApi } from '@/services/api';
import { Download, Upload, FileJson } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

// Mock data - in real app this would be fetched based on projectId
/* Unused mock data - keeping for reference
const mockProjects: Project[] = [
  {
    userId: 'user-123',
    projectId: 'proj-1',
    name: 'Customer Support Bot',
    description: 'Multi-agent system for handling customer inquiries and support tickets',
    agentIds: ['agent-1', 'agent-2', 'agent-3'],
    toolIds: ['tool-1', 'tool-2', 'tool-3', 'tool-4', 'tool-5'],
    mainAgentConfig: 'project-proj-1',
    envIds: ['env-1', 'env-2'],
    deploymentIds: ['deploy-1'],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:45:00Z'
  },
  {
    userId: 'user-123',
    projectId: 'proj-2',
    name: 'Data Analysis Pipeline',
    description: 'Automated data processing and analysis agents for business intelligence',
    agentIds: ['agent-4', 'agent-5'],
    toolIds: ['tool-6', 'tool-7', 'tool-8', 'tool-9', 'tool-10', 'tool-11', 'tool-12', 'tool-13'],
    mainAgentConfig: 'project-proj-2',
    envIds: ['env-3', 'env-4', 'env-5'],
    deploymentIds: ['deploy-2', 'deploy-3'],
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-18T16:20:00Z'
  },
  {
    userId: 'user-123',
    projectId: 'proj-3',
    name: 'Content Generation System',
    description: 'AI agents for creating and managing marketing content across platforms',
    agentIds: ['agent-6', 'agent-7', 'agent-8', 'agent-9'],
    toolIds: ['tool-14', 'tool-15', 'tool-16', 'tool-17', 'tool-18', 'tool-19'],
    mainAgentConfig: 'project-proj-3',
    envIds: ['env-6'],
    deploymentIds: [],
    createdAt: '2024-01-05T11:00:00Z',
    updatedAt: '2024-01-12T13:30:00Z'
  }
];
*/

export const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMainAgentConfig, setHasMainAgentConfig] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { loadProject } = useProjectConfigStore();

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;

      setIsLoading(true);
      try {
        // Fetch project details
        const response = await projectsApi.get(projectId);
        if (response.success && response.data) {
          setProject(response.data);
        } else {
          console.error('Failed to load project:', response.error);
          setProject(null);
        }

        // Check if main agent config exists from the project data
        if (response.success && response.data) {
          const mainAgent = response.data.config.main_agent;
          setHasMainAgentConfig(!!mainAgent && !!mainAgent.name);
        }
      } catch (error) {
        console.error('Error loading project:', error);
        setProject(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // Download project configuration as JSON
  const handleDownloadConfig = () => {
    if (!project) return;

    const configJson = JSON.stringify(project.config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportJson(content);
      setImportError('');
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);
  };

  // Validate and import configuration
  const handleImportConfig = async () => {
    if (!projectId || !importJson.trim()) return;

    setImporting(true);
    setImportError('');

    try {
      // Parse and validate JSON
      const config: ProjectConfig = JSON.parse(importJson);

      // Basic validation
      if (!config.main_agent || !config.agents || !config.tools || !config.environment) {
        throw new Error('Invalid config structure. Must include main_agent, agents, tools, and environment.');
      }

      // Update each section via the API
      const updates = [];

      if (config.main_agent) {
        updates.push(projectsApi.updateMainAgent(projectId, { mainAgent: config.main_agent }));
      }

      if (config.agents) {
        updates.push(projectsApi.updateAgents(projectId, { agents: config.agents }));
      }

      if (config.tools) {
        updates.push(projectsApi.updateTools(projectId, { tools: config.tools }));
      }

      if (config.environment) {
        updates.push(projectsApi.updateEnvironment(projectId, { environment: config.environment }));
      }

      // Execute all updates
      const results = await Promise.all(updates);

      // Check if all succeeded
      const allSucceeded = results.every(r => r.success);

      if (allSucceeded) {
        // Reload project data
        await loadProject(projectId);
        const response = await projectsApi.get(projectId);
        if (response.success && response.data) {
          setProject(response.data);
        }

        setShowImportDialog(false);
        setImportJson('');
        alert('Configuration imported successfully!');
      } else {
        throw new Error('Some updates failed. Please check the configuration and try again.');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setImportError(error.message || 'Failed to import configuration. Please check the JSON format.');
    } finally {
      setImporting(false);
    }
  };

  const getProjectStatus = (project: ProjectItem): 'active' | 'deployed' | 'inactive' => {
    // For now, deployments are not implemented in the new architecture
    if ((project.config.agents && project.config.agents.length > 0) || (project.config.tools && project.config.tools.length > 0)) return 'active';
    return 'inactive';
  };

  const getStatusColor = (status: 'active' | 'deployed' | 'inactive') => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'deployed':
        return 'bg-blue-100 text-blue-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: 'active' | 'deployed' | 'inactive') => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'deployed':
        return '🚀';
      case 'inactive':
        return '⏸️';
      default:
        return '❓';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const status = getProjectStatus(project);

  return (
    <div className="p-6">
      {/* Project Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <div className={`px-3 py-1 text-sm rounded-full flex items-center gap-2 ${getStatusColor(status)}`}>
                <span>{getStatusIcon(status)}</span>
                {status}
              </div>
            </div>
            <p className="text-muted-foreground text-lg">
              {project.description}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Created {new Date(project.createdAt).toLocaleDateString()} •
              Last updated {new Date(project.updatedAt).toLocaleDateString()}
            </p>
          </div>
          
          {/* Import/Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDownloadConfig}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors flex items-center gap-2"
              title="Download configuration as JSON"
            >
              <Download className="h-4 w-4" />
              Export Config
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
              title="Import configuration from JSON"
            >
              <Upload className="h-4 w-4" />
              Import Config
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-card rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Agents</h3>
              <div className="text-2xl font-bold text-primary">{project.config.agents?.length || 0}</div>
            </div>
            <div className="text-primary">🤖</div>
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Tools</h3>
              <div className="text-2xl font-bold text-secondary">{project.config.tools?.length || 0}</div>
            </div>
            <div className="text-secondary">🔧</div>
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Environment Variables</h3>
              <div className="text-2xl font-bold text-accent">{Object.keys(project.config.environment || {}).length}</div>
            </div>
            <div className="text-accent">⚙️</div>
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Deployments</h3>
              <div className="text-2xl font-bold text-orange-600">0</div>
            </div>
            <div className="text-orange-600">🚀</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          onClick={() => navigate(`/projects/${projectId}/agents`)}
          className="p-6 bg-card rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Manage Agents</h3>
              <p className="text-sm text-muted-foreground">Create and configure AI agents</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {project.config.agents?.length || 0} agents configured
          </div>
        </div>

        <div
          onClick={() => navigate(`/projects/${projectId}/tools`)}
          className="p-6 bg-card rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Manage Tools</h3>
              <p className="text-sm text-muted-foreground">Create custom tools and functions</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {project.config.tools?.length || 0} custom tools created
          </div>
        </div>

        <div
          onClick={() => navigate(`/projects/${projectId}/config`)}
          className="p-6 bg-card rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Environment Variables</h3>
              <p className="text-sm text-muted-foreground">Configure environment settings</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {Object.keys(project.config.environment || {}).length} variables configured
          </div>
        </div>

        <div
          onClick={() => navigate(`/projects/${projectId}/deploy`)}
          className="p-6 bg-card rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Deploy System</h3>
              <p className="text-sm text-muted-foreground">Deploy your multi-agent system</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            0 deployments
          </div>
        </div>

        {/* Main Agent Config */}
        <div
          onClick={() => navigate(`/projects/${projectId}/main-agent`)}
          className="p-6 bg-card rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🧠</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Main Agent</h3>
              <p className="text-sm text-muted-foreground">Configure the orchestrator agent</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {hasMainAgentConfig ? 'Configured' : 'Not configured'}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-6 bg-card rounded-lg border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <p className="text-sm text-muted-foreground">Latest changes and updates</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Last updated {new Date(project.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Import Configuration Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileJson className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Import Configuration</h2>
                </div>
                <button
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportJson('');
                    setImportError('');
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Upload a JSON file or paste your configuration below. This will replace the entire project configuration.
              </p>
            </div>

            <div className="p-6 flex-1 overflow-auto">
              {/* File Upload */}
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload JSON File
                </button>
              </div>

              {/* JSON Text Area */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Or paste JSON configuration:
                </label>
                <textarea
                  value={importJson}
                  onChange={(e) => {
                    setImportJson(e.target.value);
                    setImportError('');
                  }}
                  placeholder={`{
  "main_agent": { ... },
  "agents": [ ... ],
  "tools": [ ... ],
  "environment": { ... }
}`}
                  className="w-full h-64 px-3 py-2 bg-background border border-border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive">{importError}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportJson('');
                  setImportError('');
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfig}
                disabled={!importJson.trim() || importing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};