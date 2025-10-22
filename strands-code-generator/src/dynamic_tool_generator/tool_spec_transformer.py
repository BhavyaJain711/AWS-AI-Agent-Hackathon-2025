"""
Tool specification transformer - converts standardized frontend data into tool specifications
"""
from typing import Dict, Any, List, Optional
import logging

from ..models.tool_spec import ToolSpecification, ToolInputSchema, ToolType

logger = logging.getLogger(__name__)


class ToolSpecTransformer:
    """Transforms standardized frontend data into tool specifications"""
    
    def __init__(self):
        self.supported_types = {
            "frontend_action": ToolType.FRONTEND_ACTION,
            "code_execution": ToolType.CODE_EXECUTION,
            "agent_tool": ToolType.AGENT_TOOL
        }
    
    def transform_frontend_data(self, frontend_data: Dict[str, Any]) -> ToolSpecification:
        """
        Transform standardized frontend data into tool specification
        
        Expected frontend data format:
        {
            "name": "tool_name",
            "description": "Tool description", 
            "type": "frontend_action" | "code_execution",
            "inputSchema": {
                "type": "object",
                "properties": {...},
                "required": [...]
            }
        }
        
        Args:
            frontend_data: Standardized frontend data structure
            
        Returns:
            ToolSpecification: Standardized tool specification
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        try:
            self._validate_frontend_data(frontend_data)
            
            # Extract required fields
            name = self._sanitize_function_name(frontend_data["name"])
            description = frontend_data["description"]
            tool_type = self.supported_types[frontend_data["type"]]
            
            # Parse input schema
            input_schema = self._parse_input_schema(frontend_data.get("inputSchema", {}))
            
            # Create tool specification
            tool_spec = ToolSpecification(
                name=name,
                description=description,
                tool_type=tool_type,
                input_schema=input_schema,
                frontend_data=frontend_data
            )
            
            logger.info(f"Successfully transformed frontend data into tool spec: {name}")
            return tool_spec
            
        except Exception as e:
            logger.error(f"Failed to transform frontend data: {str(e)}")
            raise ValueError(f"Invalid frontend data structure: {str(e)}")
    
    def _validate_frontend_data(self, data: Dict[str, Any]) -> None:
        """Validate that frontend data has required fields in correct format"""
        required_fields = ["name", "description", "type"]
        
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Required field '{field}' missing from frontend data")
            if not data[field] or not str(data[field]).strip():
                raise ValueError(f"Required field '{field}' cannot be empty")
        
        # Validate tool type
        tool_type = data["type"]
        if tool_type not in self.supported_types:
            supported = list(self.supported_types.keys())
            raise ValueError(f"Unsupported tool type '{tool_type}'. Supported types: {supported}")
        
        # Validate input schema if present
        if "inputSchema" in data and data["inputSchema"]:
            if not isinstance(data["inputSchema"], dict):
                raise ValueError("inputSchema must be a dictionary")
    
    def _parse_input_schema(self, schema_data: Dict[str, Any]) -> ToolInputSchema:
        """Parse input schema from standardized format"""
        if not schema_data:
            return ToolInputSchema()
        
        schema_type = schema_data.get("type", "object")
        properties = schema_data.get("properties", {})
        required = schema_data.get("required", [])
        
        # Validate schema structure
        if not isinstance(properties, dict):
            raise ValueError("inputSchema.properties must be a dictionary")
        if not isinstance(required, list):
            raise ValueError("inputSchema.required must be a list")
        
        return ToolInputSchema(
            type=schema_type,
            properties=properties,
            required=required
        )
    

    
    def _sanitize_function_name(self, name: str) -> str:
        """Sanitize name for use as Python function name"""
        import re
        
        # Replace non-alphanumeric characters with underscores
        sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', name)
        
        # Ensure it starts with a letter or underscore
        if sanitized and not sanitized[0].isalpha() and sanitized[0] != '_':
            sanitized = f"tool_{sanitized}"
        
        # Remove consecutive underscores
        sanitized = re.sub(r'_+', '_', sanitized)
        
        # Remove trailing underscores
        sanitized = sanitized.strip('_')
        
        # Ensure it's not empty
        if not sanitized:
            sanitized = "generated_tool"
        
        return sanitized  
  
    @staticmethod
    def get_expected_schema() -> Dict[str, Any]:
        """
        Get the expected frontend data schema format
        
        Returns:
            Dictionary describing the expected input format
        """
        return {
            "type": "object",
            "required": ["name", "description", "type"],
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Tool name (will be sanitized for Python function naming)"
                },
                "description": {
                    "type": "string", 
                    "description": "Tool description"
                },
                "type": {
                    "type": "string",
                    "enum": ["frontend_action", "code_execution", "agent_tool"],
                    "description": "Type of tool to generate"
                },
                "inputSchema": {
                    "type": "object",
                    "description": "JSON schema for tool input validation",
                    "properties": {
                        "type": {
                            "type": "string",
                            "default": "object"
                        },
                        "properties": {
                            "type": "object",
                            "description": "Property definitions"
                        },
                        "required": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of required property names"
                        }
                    }
                }
            }
        }
    
    def validate_frontend_data_format(self, data: Dict[str, Any]) -> List[str]:
        """
        Validate frontend data and return list of validation errors
        
        Args:
            data: Frontend data to validate
            
        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []
        
        try:
            self._validate_frontend_data(data)
        except ValueError as e:
            errors.append(str(e))
        
        return errors