"""
Interface for dynamic tool generation
"""
from abc import ABC, abstractmethod
from typing import Dict, Any
from pathlib import Path
from types import ModuleType

from ..models.tool_spec import ToolSpecification


class IToolGenerator(ABC):
    """Interface for dynamic tool generation"""
    
    @abstractmethod
    def generate_tool_spec_from_frontend_data(self, frontend_data: Dict[str, Any]) -> ToolSpecification:
        """Transform frontend data into standardized tool specification"""
        pass
    
    @abstractmethod
    def generate_tool_module(self, tool_spec: ToolSpecification, output_dir: str) -> Path:
        """Generate Python module file from tool specification"""
        pass
    
    @abstractmethod
    def create_frontend_action_tool(self, tool_spec: ToolSpecification, output_dir: str) -> Path:
        """Create a frontend action tool module"""
        pass
    
    @abstractmethod
    def load_tool_module(self, module_path: Path) -> ModuleType:
        """Dynamically load a tool module"""
        pass