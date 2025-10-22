import { type LegacyAgent } from '@/types';

interface AgentCardProps {
  agent: LegacyAgent;
  onEdit?: (agent: LegacyAgent) => void;
  onDelete?: (agent: LegacyAgent) => void;
}

export const AgentCard = ({ agent, onEdit, onDelete }: AgentCardProps) => {
  const getModelIcon = () => {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  };

  const getModelLabel = (modelId: string) => {
    if (modelId.includes('claude-3-sonnet')) return 'Claude 3 Sonnet';
    if (modelId.includes('claude-3-haiku')) return 'Claude 3 Haiku';
    if (modelId.includes('claude-3-opus')) return 'Claude 3 Opus';
    return 'Custom Model';
  };

  const getRegionLabel = (region: string) => {
    const regionMap: Record<string, string> = {
      'us-east-1': 'US East (N. Virginia)',
      'us-west-2': 'US West (Oregon)',
      'eu-west-1': 'Europe (Ireland)',
      'ap-southeast-1': 'Asia Pacific (Singapore)'
    };
    return regionMap[region] || region;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded border bg-primary/10 text-primary border-primary/20">
            {getModelIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{agent.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
              Agent Tool
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(agent)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
              title="Edit agent"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(agent)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              title="Delete agent"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {agent.description}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Model:</span>
          <span className="font-medium">{getModelLabel(agent.model.model_id)}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Region:</span>
          <span className="font-medium">{getRegionLabel(agent.model.region)}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Tools:</span>
          <span className="font-medium">{agent?.tools?.length + agent?.builtinTools?.length}</span>
        </div>

        {agent?.tools?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {agent?.tools?.length} Custom Tools
          </div>
        )}

        {agent?.builtinTools?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            {agent?.builtinTools?.length} Built-in Tools
          </div>
        )}
      </div>
    </div>
  );
};