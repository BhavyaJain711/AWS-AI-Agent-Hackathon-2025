"""
Interface for agent factory
"""
from abc import ABC, abstractmethod
from typing import List, Any
from types import ModuleType

from ..models.agent_config import AgentConfig


class IAgentFactory(ABC):
    """Interface for creating and configuring Strands SDK agents"""
    
    @abstractmethod
    def create_agent(self, config: AgentConfig, tools: List[ModuleType]) -> Any:
        """Create a Strands SDK agent instance"""
        pass
    
    @abstractmethod
    def configure_agent_tools(self, agent: Any, tools: List[ModuleType]) -> None:
        """Register tools with an agent"""
        pass
    
    @abstractmethod
    def setup_agent_as_tool(self, agent: Any, parent_agent: Any) -> None:
        """Configure an agent to be used as a tool by another agent"""
        pass