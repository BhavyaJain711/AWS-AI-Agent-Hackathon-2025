import { type LegacyTool } from '@/types';

interface ToolCardProps {
  tool: LegacyTool;
  onEdit?: (tool: LegacyTool) => void;
  onDelete?: (tool: LegacyTool) => void;
}

export const ToolCard = ({ tool, onEdit, onDelete }: ToolCardProps) => {
  const getTypeIcon = (type: string) => {
    if (type === 'frontend_action') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    );
  };

  const getTypeLabel = (type: string) => {
    return type === 'frontend_action' ? 'Frontend Action' : 'Code Tool';
  };

  const getTypeColor = (type: string) => {
    return type === 'frontend_action' 
      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
      : 'bg-green-500/10 text-green-500 border-green-500/20';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded border ${getTypeColor(tool.type)}`}>
            {getTypeIcon(tool.type)}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{tool.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(tool.type)}`}>
              {getTypeLabel(tool.type)}
            </span>
          </div>
        </div>
        
        {!tool.isBuiltin && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(tool)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                title="Edit tool"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(tool)}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                title="Delete tool"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {tool.description || 'No description provided'}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Parameters:</span>
          <span className="font-medium">
            {Object.keys(tool.inputSchema.properties || {}).length}
          </span>
        </div>
        
        {tool.inputSchema.required && tool.inputSchema.required.length > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Required:</span>
            <span className="font-medium">{tool.inputSchema.required.length}</span>
          </div>
        )}

        {tool.isBuiltin && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Built-in Tool
          </div>
        )}
      </div>
    </div>
  );
};