import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import type { MainAgentConfigData } from '@/types/api';

interface MainAgentConfigProps {
  projectId: string;
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

export const MainAgentConfig: React.FC<MainAgentConfigProps> = ({ 
  projectId
}) => {
  const [config, setConfig] = useState<MainAgentConfigData>({
    name: '',
    description: '',
    system_prompt: '',
    model: {
      region: '',
      model_id: ''
    }
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { success, error: showError } = useToast();
  
  // Get main agent config from store
  const { project, loading, updateMainAgent, saveMainAgent, savingMainAgent, loadProject } = useProjectConfigStore();

  // Load project and sync config
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // Sync config from store
  useEffect(() => {
    if (project?.config.main_agent) {
      const mainAgent = project.config.main_agent;
      setConfig({
        name: mainAgent.name || '',
        description: mainAgent.description || '',
        system_prompt: mainAgent.system_prompt || '',
        model: {
          region: mainAgent.model?.region || '',
          model_id: mainAgent.model?.model_id || ''
        }
      });
    }
  }, [project]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.name.trim()) {
      newErrors.name = 'Agent name is required';
    } else if (config.name.length < 2) {
      newErrors.name = 'Agent name must be at least 2 characters';
    }

    if (!config.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (config.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!config.system_prompt.trim()) {
      newErrors.system_prompt = 'System prompt is required';
    } else if (config.system_prompt.length < 20) {
      newErrors.system_prompt = 'System prompt must be at least 20 characters';
    }

    if (!config.model.region) {
      newErrors.region = 'AWS region is required';
    }

    if (!config.model.model_id) {
      newErrors.model_id = 'Model selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showError('Please fix the validation errors before saving.');
      return;
    }

    try {
      // Update store with new config
      updateMainAgent({
        name: config.name,
        description: config.description,
        system_prompt: config.system_prompt,
        model: config.model
      });

      // Save to backend
      const saveSuccess = await saveMainAgent(projectId);
      
      if (saveSuccess) {
        success('Main agent configuration has been saved successfully.');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error: any) {
      console.error('Failed to save main agent config:', error);
      showError(error.message || 'Failed to save configuration. Please try again.');
    }
  };

  const updateConfig = (updates: Partial<MainAgentConfigData>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
      model: {
        ...prev.model,
        ...(updates.model || {})
      }
    }));
    
    // Clear related errors when user starts typing
    if (updates.name !== undefined) delete errors.name;
    if (updates.description !== undefined) delete errors.description;
    if (updates.system_prompt !== undefined) delete errors.system_prompt;
    if (updates.model?.region !== undefined) delete errors.region;
    if (updates.model?.model_id !== undefined) delete errors.model_id;
  };

  // Handle region change - update model ID to match new region
  const handleRegionChange = (newRegion: string) => {
    const regionData = AWS_REGIONS.find(r => r.value === newRegion);
    const regionPrefix = regionData?.prefix || 'us';
    
    // Get current model name from current model ID
    const currentModelName = getModelNameFromId(config.model.model_id);
    
    // Find the model definition
    const modelDef = AI_MODELS.find(m => m.name === currentModelName);
    
    if (modelDef) {
      const newModelId = modelDef.getModelId(regionPrefix);
      updateConfig({ 
        model: { 
          region: newRegion, 
          model_id: newModelId 
        } 
      });
    } else {
      // Fallback to default model
      updateConfig({ 
        model: { 
          region: newRegion, 
          model_id: `${regionPrefix}.amazon.nova-premier-v1:0` 
        } 
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Main Agent Configuration
          <span className="text-sm font-normal text-muted-foreground">
            Configure your orchestrator agent
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent Name *</Label>
            <Input
              id="agent-name"
              placeholder="Main Orchestrator"
              value={config.name}
              onChange={(e) => updateConfig({ name: e.target.value })}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.name}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-description">Description *</Label>
            <Textarea
              id="agent-description"
              placeholder="Main orchestrator agent that routes queries to specialized agents"
              value={config.description}
              onChange={(e) => updateConfig({ description: e.target.value })}
              rows={3}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.description}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt *</Label>
            <Textarea
              id="system-prompt"
              placeholder="You are the main orchestrator agent responsible for routing user queries to the most appropriate specialized agent. Analyze the user's request and determine which agent can best handle it..."
              value={config.system_prompt}
              onChange={(e) => updateConfig({ system_prompt: e.target.value })}
              rows={6}
              className={errors.system_prompt ? 'border-destructive' : ''}
            />
            {errors.system_prompt && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.system_prompt}</AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              Define how your main agent should behave and route requests to other agents.
            </p>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Model Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Select the AWS region and AI model for the main agent. Model IDs are automatically adjusted based on the selected region.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aws-region">AWS Region *</Label>
              <Select
                value={config.model.region}
                onValueChange={handleRegionChange}
              >
                <SelectTrigger className={errors.region ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select AWS region" />
                </SelectTrigger>
                <SelectContent>
                  {AWS_REGIONS.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.region && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.region}</AlertDescription>
                </Alert>
              )}
              {config.model.region && (
                <p className="text-xs text-muted-foreground">
                  Region prefix: {AWS_REGIONS.find(r => r.value === config.model.region)?.prefix || 'us'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-id">Model *</Label>
              <Select
                value={config.model.model_id}
                onValueChange={(value) => updateConfig({ model: { ...config.model, model_id: value } })}
              >
                <SelectTrigger className={errors.model_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  {getModelsForRegion(config.model.region || 'us-east-1').map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.model_id && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.model_id}</AlertDescription>
                </Alert>
              )}
              {config.model.model_id && (
                <p className="text-xs text-muted-foreground font-mono">
                  {config.model.model_id}
                </p>
              )}
            </div>
          </div>

          {/* Model descriptions grouped by provider */}
          {config.model.region && (
            <div className="space-y-3 pt-2">
              {['Amazon', 'Anthropic'].map(provider => {
                const providerModels = getModelsForRegion(config.model.region).filter(m => m.provider === provider);
                if (providerModels.length === 0) return null;
                
                return (
                  <div key={provider}>
                    <h4 className="text-sm font-medium mb-2">{provider} Models</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      {providerModels.map(model => (
                        <div
                          key={model.value}
                          onClick={() => updateConfig({ model: { ...config.model, model_id: model.value } })}
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            config.model.model_id === model.value
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
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={savingMainAgent}
            className="min-w-[120px]"
          >
            {savingMainAgent ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};