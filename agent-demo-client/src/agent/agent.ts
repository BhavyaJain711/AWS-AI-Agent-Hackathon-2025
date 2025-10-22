// agent/agent.ts
import { AgentRegistry } from "./AgentRegistry";

export const agent = {
  call(action: string, id: string, ...args: any[]): unknown {
    return AgentRegistry.call(action, id, ...args);
  },

  debug(): void {
    AgentRegistry.debug();
  },
};
