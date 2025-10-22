// agent/types.ts
export type AgentAction = (...args: any[]) => any;

export type AgentActions = Record<string, AgentAction>;

export interface AgentRegistryEntry {
  [action: string]: AgentAction;
}
