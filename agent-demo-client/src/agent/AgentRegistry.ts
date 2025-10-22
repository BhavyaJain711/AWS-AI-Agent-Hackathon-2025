// agent/AgentRegistry.ts
import type { AgentActions, AgentRegistryEntry } from "./types";

const registry = new Map<string, AgentRegistryEntry>();

export const AgentRegistry = {
  register(id: string, actions: AgentActions): void {
    if (!registry.has(id)) {
      registry.set(id, {});
    }

    const existing = registry.get(id)!;
    registry.set(id, { ...existing, ...actions });
  },

  unregister(id: string, actions: AgentActions): void {
    const existing = registry.get(id);
    if (!existing) return;

    const remaining = { ...existing };
    for (const key of Object.keys(actions)) {
      if (remaining[key] === actions[key]) {
        delete remaining[key];
      }
    }

    if (Object.keys(remaining).length > 0) {
      registry.set(id, remaining);
    } else {
      registry.delete(id);
    }
  },

  call(action: string, id: string, ...args: any[]): unknown {
    const entry = registry.get(id);
    if (!entry) {
      console.warn(`[AgentRegistry] No entry found for id: ${id}`);
      return;
    }

    const fn = entry[action];
    if (typeof fn === "function") {
      return fn(...args);
    }

    console.warn(`[AgentRegistry] No action "${action}" found for id: ${id}`);
  },

  debug(): void {
    console.log("[AgentRegistry]", Object.fromEntries(registry));
  },
};
