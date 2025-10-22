import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { type Agent, type CreateAgentRequest, type LegacyTool } from '@/types';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { BUILTIN_TOOLS, type BuiltinToolDefinition } from '@/constants/builtinTools';

interface AgentFormProps {
    agent?: Agent;
    onSave: (data: CreateAgentRequest) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

// Available AWS regions for Bedrock models
const AWS_REGIONS = [
    { value: 'us-east-1', label: 'US East (N. Virginia)', prefix: 'us' },
    { value: 'us-west-2', label: 'US West (Oregon)', prefix: 'us' },
    { value: 'us-east-2', label: 'US East (Ohio)', prefix: 'us' },
    { value: 'us-west-1', label: 'US West (N. California)', prefix: 'us' },
    { value: 'eu-west-1', label: 'Europe (Ireland)', prefix: 'eu' },
    { value: 'eu-west-2', label: 'Europe (London)', prefix: 'eu' },
    { value: 'eu-west-3', label: 'Europe (Paris)', prefix: 'eu' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)', prefix: 'eu' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)', prefix: 'ap' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)', prefix: 'ap' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)', prefix: 'ap' },
    { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)', prefix: 'ap' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)', prefix: 'ap' },
    { value: 'ca-central-1', label: 'Canada (Central)', prefix: 'ca' },
    { value: 'sa-east-1', label: 'South America (São Paulo)', prefix: 'sa' },
];

// Model definitions with region-specific IDs
interface ModelDefinition {
    name: string;
    label: string;
    description: string;
    provider: 'Amazon' | 'Anthropic';
    getModelId: (regionPrefix: string) => string;
    availableRegions?: string[]; // If undefined, available in all regions
}

const AI_MODELS: ModelDefinition[] = [
    // Amazon Nova models (region-specific prefix)
    {
        name: 'nova-premier',
        label: 'Amazon Nova Premier',
        description: 'Most capable Amazon model for complex reasoning and analysis',
        provider: 'Amazon',
        getModelId: (prefix) => `${prefix}.amazon.nova-premier-v1:0`,
    },
    {
        name: 'nova-pro',
        label: 'Amazon Nova Pro',
        description: 'Balanced performance for most tasks',
        provider: 'Amazon',
        getModelId: (prefix) => `${prefix}.amazon.nova-pro-v1:0`,
    },
    {
        name: 'nova-lite',
        label: 'Amazon Nova Lite',
        description: 'Fast and cost-effective for simple tasks',
        provider: 'Amazon',
        getModelId: (prefix) => `${prefix}.amazon.nova-lite-v1:0`,
    },
    {
        name: 'nova-micro',
        label: 'Amazon Nova Micro',
        description: 'Ultra-fast for basic text processing',
        provider: 'Amazon',
        getModelId: (prefix) => `${prefix}.amazon.nova-micro-v1:0`,
    },
    // Claude models (same ID across regions)
    {
        name: 'claude-3-5-sonnet-v2',
        label: 'Claude 3.5 Sonnet v2',
        description: 'Latest Claude model with enhanced capabilities',
        provider: 'Anthropic',
        getModelId: () => 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    },
    {
        name: 'claude-3-5-sonnet',
        label: 'Claude 3.5 Sonnet',
        description: 'Advanced reasoning and analysis',
        provider: 'Anthropic',
        getModelId: () => 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    },
    {
        name: 'claude-3-opus',
        label: 'Claude 3 Opus',
        description: 'Most capable Claude model for complex tasks',
        provider: 'Anthropic',
        getModelId: () => 'anthropic.claude-3-opus-20240229-v1:0',
    },
    {
        name: 'claude-3-sonnet',
        label: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed',
        provider: 'Anthropic',
        getModelId: () => 'anthropic.claude-3-sonnet-20240229-v1:0',
    },
    {
        name: 'claude-3-haiku',
        label: 'Claude 3 Haiku',
        description: 'Fastest Claude model for quick responses',
        provider: 'Anthropic',
        getModelId: () => 'anthropic.claude-3-haiku-20240307-v1:0',
    },
];

// Helper function to get available models for a region
const getModelsForRegion = (region: string): Array<{ value: string; label: string; description: string; provider: string }> => {
    const regionData = AWS_REGIONS.find(r => r.value === region);
    const regionPrefix = regionData?.prefix || 'us';

    return AI_MODELS.map(model => ({
        value: model.getModelId(regionPrefix),
        label: model.label,
        description: model.description,
        provider: model.provider,
    }));
};

// Helper function to find model name from model ID
const getModelNameFromId = (modelId: string): string => {
    // Extract the model name from the ID
    if (modelId.includes('nova-premier')) return 'nova-premier';
    if (modelId.includes('nova-pro')) return 'nova-pro';
    if (modelId.includes('nova-lite')) return 'nova-lite';
    if (modelId.includes('nova-micro')) return 'nova-micro';
    if (modelId.includes('claude-3-5-sonnet-20241022')) return 'claude-3-5-sonnet-v2';
    if (modelId.includes('claude-3-5-sonnet')) return 'claude-3-5-sonnet';
    if (modelId.includes('claude-3-opus')) return 'claude-3-opus';
    if (modelId.includes('claude-3-sonnet')) return 'claude-3-sonnet';
    if (modelId.includes('claude-3-haiku')) return 'claude-3-haiku';
    return 'nova-premier'; // default
};

export const AgentForm = ({ agent, onSave, onCancel, isLoading }: AgentFormProps) => {
    const { projectId } = useParams<{ projectId: string }>();

    const [formData, setFormData] = useState(() => {
        // When editing, we need to separate agent tools from builtin tools
        const builtinTools = agent?.config.builtin_tools || [];
        const agentTools: string[] = [];
        const actualBuiltinTools: string[] = [];

        // This is a simplified separation - in a real app, you'd have a way to identify agent tools
        // For now, we'll assume all tools in builtin_tools are actual builtin tools
        builtinTools.forEach(tool => {
            actualBuiltinTools.push(tool);
        });

        const initialRegion = agent?.config.model.region || 'us-east-1';
        const initialModelId = agent?.config.model.model_id || 'us.amazon.nova-premier-v1:0';
        const initialModelName = getModelNameFromId(initialModelId);

        return {
            name: agent?.config.name || '',
            description: agent?.config.description || '',
            systemPrompt: agent?.config.system_prompt || '',
            region: initialRegion,
            modelName: initialModelName,
            modelId: initialModelId,
            customTools: agent?.config.tools || [],
            builtinTools: actualBuiltinTools,
            agentTools: agentTools,
        };
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [availableCustomTools, setAvailableCustomTools] = useState<LegacyTool[]>([]);
    const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
    const [toolsLoading, setToolsLoading] = useState(true);
    const [showSystemPromptHelp, setShowSystemPromptHelp] = useState(false);
    const [showToolSearch, setShowToolSearch] = useState({ custom: false, builtin: false, agents: false });
    const [toolSearchTerms, setToolSearchTerms] = useState({ custom: '', builtin: '', agents: '' });

    // Get builtin tools from constants
    const availableBuiltinTools = BUILTIN_TOOLS;

    // Get project config from store
    const { project, loadProject } = useProjectConfigStore();

    // Load project config once on mount
    useEffect(() => {
        if (projectId) {
            loadProject(projectId);
        }
    }, [projectId, loadProject]);

    // Update available tools and agents when project changes
    useEffect(() => {
        if (!project) return;

        setToolsLoading(true);
        try {
            // Convert config tools to legacy format
            if (project.config.tools) {
                const customTools = project.config.tools.map((tool) => ({
                    id: tool.name,
                    name: tool.name,
                    description: tool.description,
                    type: tool.type,
                    inputSchema: tool.inputSchema,
                    code: tool.code,
                    isBuiltin: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }));
                setAvailableCustomTools(customTools);
            }

            // Convert config agents to legacy format (for agent-as-tool pattern)
            if (project.config.agents) {
                const agents = project.config.agents
                    .filter((a) =>
                        // Exclude current agent if editing
                        agent ? a.name !== agent.config.name : true
                    )
                    .map((a) => ({
                        userId: 'user',
                        agentId: a.name,
                        projectId: projectId,
                        name: a.name,
                        config: a,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    } as Agent));
                setAvailableAgents(agents);
            }
        } catch (error) {
            console.error('Failed to process resources:', error);
            setAvailableCustomTools([]);
            setAvailableAgents([]);
        } finally {
            setToolsLoading(false);
        }
    }, [project, agent, projectId]);

    // System prompt templates
    const systemPromptTemplates = {
        general: `You are a helpful AI assistant specialized in [DOMAIN]. Your role is to:

1. Analyze user requests and provide accurate, helpful responses
2. Use the available tools when needed to gather information or perform actions
3. Explain your reasoning and provide clear, actionable advice
4. Ask clarifying questions when the user's request is ambiguous

Always be professional, concise, and focus on providing value to the user.`,

        specialist: `You are an expert [SPECIALIST_TYPE] with deep knowledge in [DOMAIN]. Your responsibilities include:

1. Providing expert-level analysis and recommendations
2. Using specialized tools to perform complex tasks
3. Breaking down complex problems into manageable steps
4. Ensuring accuracy and attention to detail in all responses

Leverage your expertise to deliver high-quality, professional results.`,

        coordinator: `You are a coordination agent responsible for managing complex multi-step processes. Your role is to:

1. Break down complex requests into smaller, manageable tasks
2. Coordinate with other specialized agents to complete tasks
3. Monitor progress and ensure quality across all steps
4. Provide clear status updates and final summaries

Focus on efficient task management and clear communication.`
    };

    // Filter functions for search
    const filterCustomTools = (tools: LegacyTool[], searchTerm: string) => {
        if (!searchTerm) return tools;
        return tools.filter(tool =>
            tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const filterBuiltinTools = (tools: BuiltinToolDefinition[], searchTerm: string) => {
        if (!searchTerm) return tools;
        return tools.filter(tool =>
            tool.toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tool.category && tool.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    const filterAgents = (agents: Agent[], searchTerm: string) => {
        if (!searchTerm) return agents;
        return agents.filter(agent =>
            agent.config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            agent.config.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Validation function
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Agent name is required';
        } else if (formData.name.length > 100) {
            newErrors.name = 'Agent name must be 100 characters or less';
        } else if (!/^[a-zA-Z0-9_\s-]+$/.test(formData.name)) {
            newErrors.name = 'Agent name can only contain letters, numbers, spaces, hyphens, and underscores';
        }

        // Description validation
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        } else if (formData.description.length > 500) {
            newErrors.description = 'Description must be 500 characters or less';
        }

        // System prompt validation
        if (!formData.systemPrompt.trim()) {
            newErrors.systemPrompt = 'System prompt is required';
        } else if (formData.systemPrompt.length < 50) {
            newErrors.systemPrompt = 'System prompt should be at least 50 characters for effective agent behavior';
        } else if (formData.systemPrompt.length > 4000) {
            newErrors.systemPrompt = 'System prompt must be 4000 characters or less';
        }

        // Model configuration validation (Requirement 7.2)
        if (!formData.region || !formData.region.trim()) {
            newErrors.region = 'AWS region is required';
        }

        if (!formData.modelId || !formData.modelId.trim()) {
            newErrors.modelId = 'Model selection is required';
        }

        // Validate that model configuration is complete
        if (formData.region && formData.modelId) {
            // Verify the model ID is valid for the selected region
            const availableModels = getModelsForRegion(formData.region);
            const isValidModel = availableModels.some(m => m.value === formData.modelId);
            if (!isValidModel) {
                newErrors.modelId = 'Selected model is not available in the chosen region';
            }
        }

        // Agent tools validation - verify all referenced agents exist (Requirement 7.2)
        if (formData.agentTools.length > 0) {
            const availableAgentNames = availableAgents.map(a => a.config.name);
            const invalidAgentTools = formData.agentTools.filter(
                agentName => !availableAgentNames.includes(agentName)
            );

            if (invalidAgentTools.length > 0) {
                newErrors.agentTools = `The following agent tools do not exist: ${invalidAgentTools.join(', ')}`;
            }
        }

        // Tool assignment validation (at least one tool should be assigned)
        if (formData.customTools.length === 0 && formData.builtinTools.length === 0 && formData.agentTools.length === 0) {
            newErrors.tools = 'At least one tool must be assigned to the agent';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const agentData: CreateAgentRequest = {
            projectId: projectId!,
            name: formData.name.trim(),
            description: formData.description.trim(),
            systemPrompt: formData.systemPrompt.trim(),
            tools: formData.customTools,
            builtinTools: [...formData.builtinTools, ...formData.agentTools], // Combine builtin and agent tools
            model: {
                region: formData.region,
                model_id: formData.modelId,
            },
        };

        onSave(agentData);
    };

    // Handle input changes
    const handleInputChange = (field: string, value: string | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Handle region change - update model ID to match new region
    const handleRegionChange = (newRegion: string) => {
        const regionData = AWS_REGIONS.find(r => r.value === newRegion);
        const regionPrefix = regionData?.prefix || 'us';

        // Find the current model definition
        const currentModel = AI_MODELS.find(m => m.name === formData.modelName);

        if (currentModel) {
            const newModelId = currentModel.getModelId(regionPrefix);
            setFormData(prev => ({
                ...prev,
                region: newRegion,
                modelId: newModelId,
            }));
        } else {
            // Fallback to default model
            setFormData(prev => ({
                ...prev,
                region: newRegion,
                modelName: 'nova-premier',
                modelId: `${regionPrefix}.amazon.nova-premier-v1:0`,
            }));
        }

        // Clear region error
        if (errors.region) {
            setErrors(prev => ({ ...prev, region: '' }));
        }
    };

    // Handle model change
    const handleModelChange = (newModelId: string) => {
        const newModelName = getModelNameFromId(newModelId);
        setFormData(prev => ({
            ...prev,
            modelName: newModelName,
            modelId: newModelId,
        }));

        // Clear model error
        if (errors.modelId) {
            setErrors(prev => ({ ...prev, modelId: '' }));
        }
    };

    // Toggle tool selection
    const toggleCustomTool = (toolName: string) => {
        const newTools = formData.customTools.includes(toolName)
            ? formData.customTools.filter(t => t !== toolName)
            : [...formData.customTools, toolName];
        handleInputChange('customTools', newTools);
    };

    const toggleBuiltinTool = (toolName: string) => {
        const newTools = formData.builtinTools.includes(toolName)
            ? formData.builtinTools.filter(t => t !== toolName)
            : [...formData.builtinTools, toolName];
        handleInputChange('builtinTools', newTools);
    };

    const toggleAgentTool = (agentName: string) => {
        const newTools = formData.agentTools.includes(agentName)
            ? formData.agentTools.filter(t => t !== agentName)
            : [...formData.agentTools, agentName];
        handleInputChange('agentTools', newTools);
    };

    // Apply system prompt template
    const applySystemPromptTemplate = (templateKey: keyof typeof systemPromptTemplates) => {
        const template = systemPromptTemplates[templateKey];
        setFormData(prev => ({ ...prev, systemPrompt: template }));

        // Clear system prompt errors when applying template
        if (errors.systemPrompt) {
            setErrors(prev => ({ ...prev, systemPrompt: '' }));
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">
                    {agent ? 'Edit Agent' : 'Create New Agent'}
                </h2>
                <p className="text-muted-foreground">
                    {agent ? 'Update your agent configuration and tool assignments.' : 'Create a new AI agent with custom tools and behavior.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Agent Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="e.g., Data Analyst, Content Writer"
                                className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${errors.name ? 'border-destructive' : 'border-border'
                                    }`}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive mt-1">{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Brief description of the agent's purpose"
                                className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${errors.description ? 'border-destructive' : 'border-border'
                                    }`}
                            />
                            {errors.description && (
                                <p className="text-sm text-destructive mt-1">{errors.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Model Configuration */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Model Configuration</h3>

                    <p className="text-sm text-muted-foreground">
                        Select the AWS region and AI model for this agent. Model IDs are automatically adjusted based on the selected region.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">AWS Region</label>
                            <select
                                value={formData.region}
                                onChange={(e) => handleRegionChange(e.target.value)}
                                className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${errors.region ? 'border-destructive' : 'border-border'
                                    }`}
                            >
                                {AWS_REGIONS.map(region => (
                                    <option key={region.value} value={region.value}>
                                        {region.label}
                                    </option>
                                ))}
                            </select>
                            {errors.region && (
                                <p className="text-sm text-destructive mt-1">{errors.region}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Region prefix: {AWS_REGIONS.find(r => r.value === formData.region)?.prefix || 'us'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Model</label>
                            <select
                                value={formData.modelId}
                                onChange={(e) => handleModelChange(e.target.value)}
                                className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${errors.modelId ? 'border-destructive' : 'border-border'
                                    }`}
                            >
                                {getModelsForRegion(formData.region).map(model => (
                                    <option key={model.value} value={model.value}>
                                        {model.label}
                                    </option>
                                ))}
                            </select>
                            {errors.modelId && (
                                <p className="text-sm text-destructive mt-1">{errors.modelId}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                                {formData.modelId}
                            </p>
                        </div>
                    </div>

                    {/* Model descriptions grouped by provider */}
                    <div className="space-y-3">
                        {['Amazon', 'Anthropic'].map(provider => {
                            const providerModels = getModelsForRegion(formData.region).filter(m => m.provider === provider);
                            if (providerModels.length === 0) return null;

                            return (
                                <div key={provider}>
                                    <h4 className="text-sm font-medium mb-2">{provider} Models</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                        {providerModels.map(model => (
                                            <div
                                                key={model.value}
                                                onClick={() => handleModelChange(model.value)}
                                                className={`p-3 rounded-lg border transition-all cursor-pointer ${formData.modelId === model.value
                                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                    : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5'
                                                    }`}
                                            >
                                                <div className="font-medium mb-1">{model.label}</div>
                                                <div className="text-muted-foreground text-xs">{model.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* System Prompt */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">System Prompt</h3>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowSystemPromptHelp(!showSystemPromptHelp)}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showSystemPromptHelp ? 'Hide Help' : 'Show Help'}
                            </button>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Define the agent's behavior, personality, and instructions. This is crucial for how the agent will interact and respond.
                    </p>

                    {/* System Prompt Templates */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground">Quick templates:</span>
                        <button
                            type="button"
                            onClick={() => applySystemPromptTemplate('general')}
                            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                        >
                            General Assistant
                        </button>
                        <button
                            type="button"
                            onClick={() => applySystemPromptTemplate('specialist')}
                            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                        >
                            Domain Specialist
                        </button>
                        <button
                            type="button"
                            onClick={() => applySystemPromptTemplate('coordinator')}
                            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                        >
                            Task Coordinator
                        </button>
                    </div>

                    {/* Help Section */}
                    {showSystemPromptHelp && (
                        <div className="p-4 bg-muted rounded-lg space-y-3">
                            <h4 className="font-medium">System Prompt Guidelines:</h4>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• Define the agent's role and expertise clearly</li>
                                <li>• Specify how the agent should use available tools</li>
                                <li>• Include behavioral guidelines and communication style</li>
                                <li>• Mention any specific constraints or limitations</li>
                                <li>• Use clear, direct language that the AI can follow</li>
                                <li>• Consider including examples of good responses</li>
                            </ul>
                        </div>
                    )}

                    <div>
                        <textarea
                            value={formData.systemPrompt}
                            onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                            placeholder="You are a helpful AI assistant that..."
                            rows={8}
                            className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${errors.systemPrompt ? 'border-destructive' : 'border-border'
                                }`}
                        />
                        {errors.systemPrompt && (
                            <p className="text-sm text-destructive mt-1">{errors.systemPrompt}</p>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                            {formData.systemPrompt.length}/4000 characters
                        </div>
                    </div>
                </div>

                {/* Tool Assignment */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Tool Assignment</h3>
                        <div className="text-sm text-muted-foreground">
                            {formData.customTools.length + formData.builtinTools.length + formData.agentTools.length} tools selected
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Assign tools that this agent can use to perform tasks. You can select from custom tools created in this project and built-in system tools.
                    </p>

                    {errors.tools && (
                        <p className="text-sm text-destructive">{errors.tools}</p>
                    )}

                    {toolsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <span className="ml-2 text-muted-foreground">Loading tools...</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Custom Tools */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium">Custom Tools ({availableCustomTools.length})</h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowToolSearch(prev => ({ ...prev, custom: !prev.custom }))}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showToolSearch.custom ? 'Hide Search' : 'Search Tools'}
                                    </button>
                                </div>

                                {showToolSearch.custom && (
                                    <input
                                        type="text"
                                        value={toolSearchTerms.custom}
                                        onChange={(e) => setToolSearchTerms(prev => ({ ...prev, custom: e.target.value }))}
                                        placeholder="Search custom tools..."
                                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                    />
                                )}

                                {availableCustomTools.length === 0 ? (
                                    <div className="p-4 border-2 border-dashed border-border rounded-lg text-center text-muted-foreground">
                                        <p>No custom tools available in this project.</p>
                                        <p className="text-sm mt-1">Create custom tools in the Tools section first.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {filterCustomTools(availableCustomTools, toolSearchTerms.custom).map(tool => (
                                            <div
                                                key={tool.id}
                                                className={`p-3 border rounded-lg cursor-pointer transition-all ${formData.customTools.includes(tool.name)
                                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                                                    }`}
                                                onClick={() => toggleCustomTool(tool.name)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.customTools.includes(tool.name)}
                                                                onChange={() => toggleCustomTool(tool.name)}
                                                                className="rounded border-border"
                                                            />
                                                            <span className="font-medium text-sm">{tool.name}</span>
                                                            <span className={`px-2 py-1 text-xs rounded-full ${tool.type === 'frontend_action'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-green-100 text-green-800'
                                                                }`}>
                                                                {tool.type === 'frontend_action' ? 'UI' : 'CODE'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{tool.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Built-in Tools */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium">Built-in Tools ({availableBuiltinTools.length})</h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowToolSearch(prev => ({ ...prev, builtin: !prev.builtin }))}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showToolSearch.builtin ? 'Hide Search' : 'Search Tools'}
                                    </button>
                                </div>

                                {showToolSearch.builtin && (
                                    <input
                                        type="text"
                                        value={toolSearchTerms.builtin}
                                        onChange={(e) => setToolSearchTerms(prev => ({ ...prev, builtin: e.target.value }))}
                                        placeholder="Search built-in tools..."
                                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                    />
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {filterBuiltinTools(availableBuiltinTools, toolSearchTerms.builtin).map(tool => (
                                        <div
                                            key={tool.toolName}
                                            className={`p-3 border rounded-lg cursor-pointer transition-all ${formData.builtinTools.includes(tool.toolName)
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'border-border hover:border-primary/50 hover:bg-primary/5'
                                                }`}
                                            onClick={() => toggleBuiltinTool(tool.toolName)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.builtinTools.includes(tool.toolName)}
                                                            onChange={() => toggleBuiltinTool(tool.toolName)}
                                                            className="rounded border-border"
                                                        />
                                                        <span className="font-medium text-sm">{tool.toolName}</span>
                                                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                                            BUILTIN
                                                        </span>
                                                        {tool.category && (
                                                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                                                                {tool.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Agent-as-Tool Pattern */}
                            {availableAgents.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">Other Agents as Tools ({availableAgents.length})</h4>
                                        <button
                                            type="button"
                                            onClick={() => setShowToolSearch(prev => ({ ...prev, agents: !prev.agents }))}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showToolSearch.agents ? 'Hide Search' : 'Search Agents'}
                                        </button>
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        Use other agents in this project as tools. This enables hierarchical agent coordination.
                                    </p>

                                    {showToolSearch.agents && (
                                        <input
                                            type="text"
                                            value={toolSearchTerms.agents}
                                            onChange={(e) => setToolSearchTerms(prev => ({ ...prev, agents: e.target.value }))}
                                            placeholder="Search agents..."
                                            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                        />
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {filterAgents(availableAgents, toolSearchTerms.agents).map(agentTool => (
                                            <div
                                                key={agentTool.agentId}
                                                className={`p-3 border rounded-lg cursor-pointer transition-all ${formData.agentTools.includes(agentTool.config.name)
                                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                                                    }`}
                                                onClick={() => toggleAgentTool(agentTool.config.name)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.agentTools.includes(agentTool.config.name)}
                                                                onChange={() => toggleAgentTool(agentTool.config.name)}
                                                                className="rounded border-border"
                                                            />
                                                            <span className="font-medium text-sm">{agentTool.config.name}</span>
                                                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                                                AGENT
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{agentTool.config.description}</p>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Model: {agentTool.config.model.model_id.split('.')[1]?.replace('claude-', 'Claude ') || 'Claude'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.agentTools && (
                                        <p className="text-sm text-destructive mt-2">{errors.agentTools}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Selected Tools Summary */}
                {(formData.customTools.length > 0 || formData.builtinTools.length > 0 || formData.agentTools.length > 0) && (
                    <div className="space-y-4">
                        <h4 className="font-medium">Selected Tools Summary</h4>
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.customTools.length > 0 && (
                                    <div>
                                        <h5 className="text-sm font-medium mb-2">Custom Tools ({formData.customTools.length})</h5>
                                        <div className="flex flex-wrap gap-1">
                                            {formData.customTools.map(toolName => (
                                                <span key={toolName} className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                                                    {toolName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {formData.builtinTools.length > 0 && (
                                    <div>
                                        <h5 className="text-sm font-medium mb-2">Built-in Tools ({formData.builtinTools.length})</h5>
                                        <div className="flex flex-wrap gap-1">
                                            {formData.builtinTools.map(toolName => (
                                                <span key={toolName} className="px-2 py-1 text-xs bg-secondary/50 text-secondary-foreground rounded">
                                                    {toolName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {formData.agentTools.length > 0 && (
                                    <div>
                                        <h5 className="text-sm font-medium mb-2">Agent Tools ({formData.agentTools.length})</h5>
                                        <div className="flex flex-wrap gap-1">
                                            {formData.agentTools.map(toolName => (
                                                <span key={toolName} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                                    {toolName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-4 pt-6 border-t border-border">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading && (
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                        )}
                        {agent ? 'Update Agent' : 'Create Agent'}
                    </button>
                </div>
            </form>
        </div>
    );
};