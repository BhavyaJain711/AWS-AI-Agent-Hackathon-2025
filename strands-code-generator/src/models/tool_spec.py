"""
Tool specification data models
"""
from dataclasses import dataclass
from typing import Dict, Any, Optional, List, Union
from enum import Enum


class ToolType(Enum):
    """Types of tools that can be generated"""
    FRONTEND_ACTION = "frontend_action"
    CODE_EXECUTION = "code_execution"
    AGENT_TOOL = "agent_tool"
    BUILTIN_TOOL = "builtin"


@dataclass
class ToolInputSchema:
    """JSON schema for tool input validation"""
    type: str = "object"
    properties: Dict[str, Any] = None
    required: List[str] = None
    
    def __post_init__(self):
        if self.properties is None:
            self.properties = {}
        if self.required is None:
            self.required = []


@dataclass
class ToolSpecification:
    """Standardized tool specification"""
    name: str
    description: str
    tool_type: ToolType
    input_schema: ToolInputSchema
    frontend_data: Optional[Dict[str, Any]] = None  # Original frontend data
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format for tool registration"""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": {
                "json": {
                    "type": self.input_schema.type,
                    "properties": self.input_schema.properties,
                    "required": self.input_schema.required
                }
            }
        }


@dataclass
class BuiltinToolReference:
    """Reference to a built-in tool"""
    name: str
    import_module: str = "strands_tools"


@dataclass
class AgentToolConfiguration:
    """Configuration for an agent tool"""
    name: str
    description: str
    system_prompt: str
    input_schema: ToolInputSchema
    tools: List[Union[ToolSpecification, BuiltinToolReference]]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format"""
        return {
            "name": self.name,
            "description": self.description,
            "system_prompt": self.system_prompt,
            "inputSchema": {
                "json": {
                    "type": self.input_schema.type,
                    "properties": self.input_schema.properties,
                    "required": self.input_schema.required
                }
            },
            "tools": [
                tool.to_dict() if isinstance(tool, ToolSpecification) 
                else {"type": "builtin", "name": tool.name, "import": tool.import_module}
                for tool in self.tools
            ]
        }

@dataclass
class AgentToolConfig:
    """Configuration for agent tools"""
    tool_type: str  # "builtin", "frontend", "code"
    name: str
    description: Optional[str] = None
    code: Optional[str] = None  # For code tools
    input_schema: Optional[ToolInputSchema] = None  # For frontend/code tools


@dataclass
class AgentSpecification:
    """Specification for generating agent tools"""
    name: str
    description: str
    system_prompt: str
    tools: List[AgentToolConfig]
    input_schema: ToolInputSchema
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format for agent registration"""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": {
                "json": {
                    "type": self.input_schema.type,
                    "properties": self.input_schema.properties,
                    "required": self.input_schema.required
                }
            }
        }