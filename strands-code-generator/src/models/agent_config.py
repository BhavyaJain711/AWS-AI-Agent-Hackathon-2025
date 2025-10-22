"""
Agent configuration data models
"""
from dataclasses import dataclass
from typing import Dict, Any, List, Optional


@dataclass
class BehaviorConfig:
    """Agent behavioral parameters"""
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0


@dataclass
class AgentConfig:
    """Configuration for creating a Strands SDK agent"""
    name: str
    system_prompt: str
    tools: List[str]  # List of tool names
    behavior_config: BehaviorConfig
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
    
    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> 'AgentConfig':
        """Create AgentConfig from JSON data"""
        behavior_data = data.get('behavior_config', {})
        behavior_config = BehaviorConfig(
            temperature=behavior_data.get('temperature', 0.7),
            max_tokens=behavior_data.get('max_tokens'),
            top_p=behavior_data.get('top_p', 1.0),
            frequency_penalty=behavior_data.get('frequency_penalty', 0.0),
            presence_penalty=behavior_data.get('presence_penalty', 0.0)
        )
        
        return cls(
            name=data['name'],
            system_prompt=data['system_prompt'],
            tools=data.get('tools', []),
            behavior_config=behavior_config,
            metadata=data.get('metadata', {})
        )