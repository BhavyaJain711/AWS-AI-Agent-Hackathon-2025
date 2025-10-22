"""
Dynamic Tool Generation Engine - Main integration class that orchestrates tool generation
"""
import os
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
from types import ModuleType
import logging

from ..models.tool_spec import ToolSpecification, ToolType
from .tool_spec_transformer import ToolSpecTransformer
from .module_generator import PythonModuleGenerator
from .module_loader import DynamicModuleLoader

logger = logging.getLogger(__name__)


class DynamicToolGenerationEngine:
    """
    Main engine that orchestrates the complete tool generation workflow:
    Frontend Data -> Tool Specification -> Python Module -> Loaded Tool
    """
    
    def __init__(self, tools_dir: Optional[str] = None, agents_dir: Optional[str] = None):
        """
        Initialize the tool generation engine
        
        Args:
            tools_dir: Directory to store generated tool modules
            agents_dir: Directory to store generated agent modules
        """
        self.transformer = ToolSpecTransformer()
        self.generator = PythonModuleGenerator()
        self.loader = DynamicModuleLoader()
        
        # Set up output directories
        if tools_dir:
            self.tools_dir = Path(tools_dir)
            self.tools_dir.mkdir(parents=True, exist_ok=True)
        else:
            self.temp_tools_dir = tempfile.mkdtemp(prefix="dynamic_tools_")
            self.tools_dir = Path(self.temp_tools_dir)
        
        if agents_dir:
            self.agents_dir = Path(agents_dir)
            self.agents_dir.mkdir(parents=True, exist_ok=True)
        else:
            self.temp_agents_dir = tempfile.mkdtemp(prefix="dynamic_agents_")
            self.agents_dir = Path(self.temp_agents_dir)
        
        logger.info(f"Dynamic tool generation engine initialized:")
        logger.info(f"  Tools dir: {self.tools_dir}")
        logger.info(f"  Agents dir: {self.agents_dir}")
    
    def generate_tool_from_frontend_data(self, frontend_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Complete workflow: transform frontend data into a loaded, ready-to-use tool
        
        Args:
            frontend_data: Flexible frontend data structure
            
        Returns:
            Dictionary containing:
            - 'tool_function': Callable tool function
            - 'tool_spec': Tool specification dictionary
            - 'module': Loaded module object
            - 'module_path': Path to generated module file
            
        Raises:
            ValueError: If frontend data is invalid
            ImportError: If generated module cannot be loaded
        """
        try:
            logger.info("Starting tool generation from frontend data")
            
            # Step 1: Transform frontend data to tool specification
            tool_spec = self.transformer.transform_frontend_data(frontend_data)
            logger.debug(f"Generated tool specification for: {tool_spec.name}")
            
            # Step 2: Generate Python module from specification
            if tool_spec.tool_type == ToolType.AGENT_TOOL:
                output_dir = str(self.agents_dir)
            else:
                output_dir = str(self.tools_dir)
            
            module_path = self.generator.generate_tool_module(tool_spec, output_dir)
            logger.debug(f"Generated module file: {module_path}")
            
            # Step 3: Load the generated module
            module = self.loader.load_tool_module(module_path)
            logger.debug(f"Loaded module: {module.__name__}")
            
            # Step 4: Extract tool function and validate
            tool_function = self.loader.get_tool_function(module, tool_spec.name)
            tool_spec_dict = self.loader.get_tool_spec(module)
            
            # Validate the loaded tool
            if not self.loader.validate_tool_module(module, tool_spec.name):
                raise ImportError(f"Generated tool module failed validation")
            
            result = {
                'tool_function': tool_function,
                'tool_spec': tool_spec_dict,
                'module': module,
                'module_path': module_path,
                'tool_name': tool_spec.name
            }
            
            logger.info(f"Successfully generated and loaded tool: {tool_spec.name}")
            return result
            
        except Exception as e:
            logger.error(f"Tool generation failed: {str(e)}")
            raise
    
    def generate_multiple_tools(self, frontend_data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate multiple tools from a list of frontend data structures
        
        Args:
            frontend_data_list: List of frontend data structures
            
        Returns:
            List of tool generation results
        """
        results = []
        
        for i, frontend_data in enumerate(frontend_data_list):
            try:
                result = self.generate_tool_from_frontend_data(frontend_data)
                results.append(result)
                logger.info(f"Generated tool {i+1}/{len(frontend_data_list)}: {result['tool_name']}")
            except Exception as e:
                logger.error(f"Failed to generate tool {i+1}/{len(frontend_data_list)}: {str(e)}")
                # Continue with other tools
                continue
        
        logger.info(f"Generated {len(results)}/{len(frontend_data_list)} tools successfully")
        return results
    
    def reload_tool(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """
        Reload a previously generated tool
        
        Args:
            tool_name: Name of the tool to reload
            
        Returns:
            Reloaded tool result or None if not found
        """
        # Find the module file
        module_path = self.output_dir / f"{tool_name}.py"
        
        if not module_path.exists():
            logger.warning(f"Tool module not found for reload: {tool_name}")
            return None
        
        try:
            # Force reload the module
            module = self.loader.reload_module(module_path)
            
            # Extract tool components
            tool_function = self.loader.get_tool_function(module, tool_name)
            tool_spec_dict = self.loader.get_tool_spec(module)
            
            result = {
                'tool_function': tool_function,
                'tool_spec': tool_spec_dict,
                'module': module,
                'module_path': module_path,
                'tool_name': tool_name
            }
            
            logger.info(f"Successfully reloaded tool: {tool_name}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to reload tool {tool_name}: {str(e)}")
            return None
    
    def list_generated_tools(self) -> List[str]:
        """
        List all generated tool names
        
        Returns:
            List of tool names
        """
        tool_files = list(self.output_dir.glob("*.py"))
        return [f.stem for f in tool_files]
    
    def get_loaded_tools(self) -> Dict[str, ModuleType]:
        """
        Get all currently loaded tool modules
        
        Returns:
            Dictionary mapping module paths to loaded modules
        """
        return self.loader.get_loaded_modules()
    
    def clear_all_tools(self):
        """Clear all generated tools and cached modules"""
        # Clear loader cache
        self.loader.clear_cache()
        
        # Remove generated files
        for tool_file in self.output_dir.glob("*.py"):
            try:
                tool_file.unlink()
                logger.debug(f"Removed tool file: {tool_file}")
            except Exception as e:
                logger.warning(f"Failed to remove tool file {tool_file}: {e}")
        
        logger.info("Cleared all generated tools")
    
    def cleanup(self):
        """Cleanup resources and temporary files"""
        self.clear_all_tools()
        
        # Remove temporary directory if we created one
        if hasattr(self, 'temp_dir'):
            import shutil
            try:
                shutil.rmtree(self.temp_dir)
                logger.info(f"Cleaned up temporary directory: {self.temp_dir}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temporary directory: {e}")
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit with cleanup"""
        self.cleanup()