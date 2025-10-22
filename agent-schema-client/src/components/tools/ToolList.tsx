import { useState } from 'react';
import { type LegacyTool } from '@/types';
import { ToolCard } from './ToolCard';

interface ToolListProps {
  tools: LegacyTool[];
  isLoading?: boolean;
  onEdit?: (tool: LegacyTool) => void;
  onDelete?: (tool: LegacyTool) => void;
}

export const ToolList = ({ tools, isLoading, onEdit, onDelete }: ToolListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'custom' | 'builtin' | 'frontend_action' | 'code'>('all');

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'custom' && !tool.isBuiltin) ||
      (filterType === 'builtin' && tool.isBuiltin) ||
      (filterType === 'frontend_action' && tool.type === 'frontend_action') ||
      (filterType === 'code' && tool.type === 'code');

    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded"></div>
                <div className="space-y-1">
                  <div className="w-24 h-4 bg-muted rounded"></div>
                  <div className="w-16 h-3 bg-muted rounded"></div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-full h-3 bg-muted rounded"></div>
              <div className="w-3/4 h-3 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Tools</option>
          <option value="custom">Custom Tools</option>
          <option value="builtin">Built-in Tools</option>
          <option value="frontend_action">Frontend Actions</option>
          <option value="code">Code Tools</option>
        </select>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'} found
        </p>
        
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Tool Grid */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? 'No tools found' : 'No tools yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? `No tools match "${searchTerm}". Try adjusting your search or filter.`
              : 'Create your first tool to get started with your multi-agent system.'
            }
          </p>
          {!searchTerm && (
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Create Your First Tool
            </button>
          )}
        </div>
      )}
    </div>
  );
};