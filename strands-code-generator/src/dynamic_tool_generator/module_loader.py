"""
Dynamic module loader - loads and manages generated tool modules at runtime
"""
import sys
import importlib
import importlib.util
from pathlib import Path
from types import ModuleType
from typing import Dict, Any, Optional, Callable
import logging
import time
import hashlib

logger = logging.getLogger(__name__)


class DynamicModuleLoader:
    """Loads and manages dynamically generated tool modules"""
    
    def __init__(self):
        self.loaded_modules: Dict[str, ModuleType] = {}
        self.module_cache: Dict[str, Dict[str, Any]] = {}
        self.module_timestamps: Dict[str, float] = {}
        self.module_hashes: Dict[str, str] = {}
    
    def load_tool_module(self, module_path: Path) -> ModuleType:
        """
        Load a tool module from file path with caching and reloading support
        
        Args:
            module_path: Path to the Python module file
            
        Returns:
            Loaded module object
            
        Raises:
            ImportError: If module cannot be loaded
            FileNotFoundError: If module file doesn't exist
        """
        try:
            module_path = Path(module_path).resolve()
            
            if not module_path.exists():
                raise FileNotFoundError(f"Module file not found: {module_path}")
            
            module_key = str(module_path)
            
            # Check if module needs reloading
            if self._should_reload_module(module_path, module_key):
                logger.info(f"Loading/reloading module: {module_path}")
                module = self._load_module_from_file(module_path)
                self._cache_module(module_key, module, module_path)
            else:
                logger.debug(f"Using cached module: {module_path}")
                module = self.loaded_modules[module_key]
            
            return module
            
        except Exception as e:
            logger.error(f"Failed to load module {module_path}: {str(e)}")
            raise ImportError(f"Cannot load module {module_path}: {str(e)}")
    
    def get_tool_function(self, module: ModuleType, tool_name: str) -> Callable:
        """
        Extract the tool function from a loaded module
        
        Args:
            module: Loaded module object
            tool_name: Name of the tool function to extract
            
        Returns:
            Tool function callable
            
        Raises:
            AttributeError: If tool function not found in module
        """
        # Try to get the function by name
        if hasattr(module, tool_name):
            return getattr(module, tool_name)
        
        # Try to get from __tool_function__ export
        if hasattr(module, '__tool_function__'):
            return getattr(module, '__tool_function__')
        
        # Search for any callable that matches the tool name
        for attr_name in dir(module):
            if attr_name == tool_name and callable(getattr(module, attr_name)):
                return getattr(module, attr_name)
        
        raise AttributeError(f"Tool function '{tool_name}' not found in module {module.__name__}")
    
    def get_tool_spec(self, module: ModuleType) -> Optional[Dict[str, Any]]:
        """
        Extract the tool specification from a loaded module
        
        Args:
            module: Loaded module object
            
        Returns:
            Tool specification dictionary or None if not found
        """
        # Try to get from __tool_spec__ export
        if hasattr(module, '__tool_spec__'):
            return getattr(module, '__tool_spec__')
        
        # Try to get from TOOL_SPEC constant
        if hasattr(module, 'TOOL_SPEC'):
            return getattr(module, 'TOOL_SPEC')
        
        logger.warning(f"No tool specification found in module {module.__name__}")
        return None
    
    def unload_module(self, module_path: Path) -> bool:
        """
        Unload a module from cache
        
        Args:
            module_path: Path to the module to unload
            
        Returns:
            True if module was unloaded, False if not found
        """
        module_key = str(Path(module_path).resolve())
        
        if module_key in self.loaded_modules:
            # Remove from sys.modules if present
            module = self.loaded_modules[module_key]
            if hasattr(module, '__name__') and module.__name__ in sys.modules:
                del sys.modules[module.__name__]
            
            # Remove from our caches
            del self.loaded_modules[module_key]
            self.module_cache.pop(module_key, None)
            self.module_timestamps.pop(module_key, None)
            self.module_hashes.pop(module_key, None)
            
            logger.info(f"Unloaded module: {module_path}")
            return True
        
        return False
    
    def reload_module(self, module_path: Path) -> ModuleType:
        """
        Force reload a module even if cached
        
        Args:
            module_path: Path to the module to reload
            
        Returns:
            Reloaded module object
        """
        module_key = str(Path(module_path).resolve())
        
        # Remove from cache to force reload
        self.unload_module(module_path)
        
        # Load fresh
        return self.load_tool_module(module_path)
    
    def clear_cache(self):
        """Clear all cached modules"""
        for module_key in list(self.loaded_modules.keys()):
            module_path = Path(module_key)
            self.unload_module(module_path)
        
        logger.info("Cleared all module cache")
    
    def get_loaded_modules(self) -> Dict[str, ModuleType]:
        """Get dictionary of all loaded modules"""
        return self.loaded_modules.copy()
    
    def _should_reload_module(self, module_path: Path, module_key: str) -> bool:
        """Check if module should be reloaded based on file changes"""
        # If not in cache, definitely load
        if module_key not in self.loaded_modules:
            return True
        
        try:
            # Check file modification time
            current_mtime = module_path.stat().st_mtime
            cached_mtime = self.module_timestamps.get(module_key, 0)
            
            if current_mtime > cached_mtime:
                logger.debug(f"Module file modified, will reload: {module_path}")
                return True
            
            # Check file hash for more reliable change detection
            current_hash = self._calculate_file_hash(module_path)
            cached_hash = self.module_hashes.get(module_key, "")
            
            if current_hash != cached_hash:
                logger.debug(f"Module content changed, will reload: {module_path}")
                return True
            
            return False
            
        except Exception as e:
            logger.warning(f"Error checking module changes, will reload: {e}")
            return True
    
    def _load_module_from_file(self, module_path: Path) -> ModuleType:
        """Load module from file using importlib"""
        module_name = f"dynamic_tool_{module_path.stem}_{int(time.time())}"
        
        # Create module spec
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot create module spec for {module_path}")
        
        # Create and execute module
        module = importlib.util.module_from_spec(spec)
        
        # Add to sys.modules before execution to handle circular imports
        sys.modules[module_name] = module
        
        try:
            spec.loader.exec_module(module)
        except Exception as e:
            # Clean up on failure
            sys.modules.pop(module_name, None)
            raise ImportError(f"Error executing module {module_path}: {str(e)}")
        
        return module
    
    def _cache_module(self, module_key: str, module: ModuleType, module_path: Path):
        """Cache module with metadata"""
        self.loaded_modules[module_key] = module
        self.module_timestamps[module_key] = module_path.stat().st_mtime
        self.module_hashes[module_key] = self._calculate_file_hash(module_path)
        
        # Cache module metadata
        self.module_cache[module_key] = {
            'name': getattr(module, '__name__', 'unknown'),
            'file': str(module_path),
            'loaded_at': time.time(),
            'tool_spec': self.get_tool_spec(module)
        }
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of file content"""
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
                return hashlib.sha256(content).hexdigest()
        except Exception as e:
            logger.warning(f"Error calculating hash for {file_path}: {e}")
            return ""
    
    def validate_tool_module(self, module: ModuleType, expected_tool_name: str) -> bool:
        """
        Validate that a module contains the expected tool
        
        Args:
            module: Module to validate
            expected_tool_name: Expected tool function name
            
        Returns:
            True if module is valid, False otherwise
        """
        try:
            # Check if tool function exists
            tool_function = self.get_tool_function(module, expected_tool_name)
            if not callable(tool_function):
                logger.error(f"Tool function {expected_tool_name} is not callable")
                return False
            
            # Check if tool spec exists
            tool_spec = self.get_tool_spec(module)
            if tool_spec is None:
                logger.warning(f"No tool specification found in module")
                return False
            
            # Validate tool spec structure
            required_spec_fields = ['name', 'description', 'inputSchema']
            for field in required_spec_fields:
                if field not in tool_spec:
                    logger.error(f"Missing required field '{field}' in tool spec")
                    return False
            
            logger.debug(f"Module validation successful for tool: {expected_tool_name}")
            return True
            
        except Exception as e:
            logger.error(f"Module validation failed: {str(e)}")
            return False