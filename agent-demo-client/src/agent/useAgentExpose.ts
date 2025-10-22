// agent/useAgentExpose.ts
import { useEffect } from "react";
import { AgentRegistry } from "./AgentRegistry";
import type { AgentActions } from "./types";

export function useAgentExpose(id: string | undefined, actions: AgentActions | undefined): void {
  useEffect(() => {
    if (!id || !actions) return;

    AgentRegistry.register(id, actions);
    return () => AgentRegistry.unregister(id, actions);
  }, [id, actions]);
}
