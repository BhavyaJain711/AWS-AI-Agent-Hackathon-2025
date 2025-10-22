import { useState } from 'react';
import { type LegacyAgent } from '@/types';
import { AgentCard } from './AgentCard';

interface AgentListProps {
  agents: LegacyAgent[];
  isLoading?: boolean;
  onEdit?: (agent: LegacyAgent) => void;
  onDelete?: (agent: LegacyAgent) => void;
}

export const AgentList = ({ agents, isLoading, onEdit, onDelete }: AgentListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState<'all' | 'claude-3-sonnet' | 'claude-3-haiku' | 'claude-3-opus'>('all');

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterModel === 'all' ||
      agent.model.model_id.includes(filterModel);

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
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value as any)}
          className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Models</option>
          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          <option value="claude-3-haiku">Claude 3 Haiku</option>
          <option value="claude-3-opus">Claude 3 Opus</option>
        </select>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'} found
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

      {/* Agent Grid */}
      {filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? 'No agents found' : 'No agents yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? `No agents match "${searchTerm}". Try adjusting your search or filter.`
              : 'Create your first agent to get started with your multi-agent system.'
            }
          </p>
          {!searchTerm && (
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Create Your First Agent
            </button>
          )}
        </div>
      )}
    </div>
  );
};