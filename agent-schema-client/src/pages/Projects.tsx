import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Project, type CreateProjectRequest } from '@/types';
import { ProjectForm } from '@/components/projects';
import { ToastContainer } from '@/components/ui/Toast';
import { projectsApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';

// Mock data for demonstration
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

export const Projects = () => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await projectsApi.list();
      if (response.success && response.data) {
        // Handle both ListResponse format and direct array
        const projectsList = 'items' in response.data ? response.data.items : response.data;
        setProjects(Array.isArray(projectsList) ? projectsList : []);
      } else {
        console.error('Failed to load projects:', response.error);
        toast.warning('Using offline data. Please check your connection.');
        // Fall back to mock data for development
        setProjects(mockProjects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.warning('Using offline data. Please check your connection.');
      // Fall back to mock data for development
      setProjects(mockProjects);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const getProjectStatus = (project: Project): 'active' | 'deployed' | 'inactive' => {
    if (project.deploymentIds?.length) return 'deployed';
    if (project.agentIds?.length || project.toolIds?.length) return 'active';
    return 'inactive';
  };

  const handleCreateProject = () => {
    setShowCreateForm(true);
  };

  const handleSaveProject = async (projectData: CreateProjectRequest) => {
    setIsCreating(true);
    try {
      const response = await projectsApi.create(projectData);
      if (response.success && response.data) {
        // Convert ProjectItem to Project format for the list
        const projectItem = response.data;
        const projectForList: Project = {
          userId: projectItem.userId,
          projectId: projectItem.projectId,
          name: projectItem.name,
          description: projectItem.description,
          agentIds: projectItem.config.agents.map(a => a.name),
          toolIds: projectItem.config.tools.map(t => t.name),
          createdAt: projectItem.createdAt,
          updatedAt: projectItem.updatedAt
        };
        
        setProjects(prev => [...prev, projectForList]);
        setShowCreateForm(false);

        toast.success('Project created successfully!');

        // Navigate to the new project
        navigate(`/projects/${response.data.projectId}`);
      } else {
        console.error('Failed to create project:', response.error);
        toast.error('Failed to create project: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Error creating project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
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

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-muted-foreground">
              Manage your multi-agent systems. Each project contains agents, tools, and configurations.
            </p>
          </div>
          <button
            onClick={handleCreateProject}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Create Project
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Total Projects</h3>
            <div className="text-2xl font-bold text-primary">{projects.length}</div>
            <p className="text-sm text-muted-foreground">Active projects</p>
          </div>

          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Total Agents</h3>
            <div className="text-2xl font-bold">
              {projects.reduce((sum, p) => sum + p.agentIds?.length, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Across all projects</p>
          </div>

          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Total Tools</h3>
            <div className="text-2xl font-bold">
              {projects.reduce((sum, p) => sum + p.toolIds?.length, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Custom tools created</p>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-lg border animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-full mb-1"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
                <div className="w-16 h-6 bg-muted rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-16 bg-muted rounded"></div>
                <div className="h-16 bg-muted rounded"></div>
              </div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const status = getProjectStatus(project);
            return (
              <div
                key={project.projectId}
                onClick={() => handleProjectClick(project.projectId)}
                className="p-6 bg-card rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getStatusColor(status)}`}>
                    <span>{getStatusIcon(status)}</span>
                    {status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-lg font-bold text-primary">{project.agentIds?.length}</div>
                    <div className="text-xs text-muted-foreground">Agents</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-lg font-bold">{project.toolIds?.length}</div>
                    <div className="text-xs text-muted-foreground">Tools</div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}

          {/* Create New Project Card */}
          <div
            onClick={handleCreateProject}
            className="p-6 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
          >
            <div className="text-4xl mb-4">➕</div>
            <h3 className="text-lg font-semibold mb-2">Create New Project</h3>
            <p className="text-sm text-muted-foreground text-center">
              Start building a new multi-agent system
            </p>
          </div>
        </div>
      )}

      {/* Create Project Form */}
      {showCreateForm && (
        <ProjectForm
          onSave={handleSaveProject}
          onCancel={handleCancelCreate}
          isLoading={isCreating}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};