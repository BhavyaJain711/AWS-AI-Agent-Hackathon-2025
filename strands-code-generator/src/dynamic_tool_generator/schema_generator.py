"""
JSON Schema generation utilities for tool input validation
"""
from typing import Dict, Any, List, Optional, Union
import logging

logger = logging.getLogger(__name__)


class JSONSchemaGenerator:
    """Generates JSON schemas for tool input validation"""
    
    def __init__(self):
        self.type_mapping = {
            "str": "string",
            "string": "string",
            "int": "integer",
            "integer": "integer",
            "float": "number",
            "number": "number",
            "bool": "boolean",
            "boolean": "boolean",
            "list": "array",
            "array": "array",
            "dict": "object",
            "object": "object"
        }
    
    def generate_schema(self, properties: Dict[str, Any], required: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Generate a complete JSON schema from property definitions
        
        Args:
            properties: Dictionary of property definitions
            required: List of required property names
            
        Returns:
            Complete JSON schema dictionary
        """
        schema = {
            "type": "object",
            "properties": {},
            "required": required or []
        }
        
        for prop_name, prop_def in properties.items():
            schema["properties"][prop_name] = self._generate_property_schema(prop_def)
        
        return schema
    
    def _generate_property_schema(self, prop_def: Any) -> Dict[str, Any]:
        """Generate schema for a single property"""
        if isinstance(prop_def, dict):
            return self._process_property_dict(prop_def)
        elif isinstance(prop_def, str):
            return {"type": self._normalize_type(prop_def)}
        else:
            # Infer from value type
            return {"type": self._infer_type(prop_def)}
    
    def _process_property_dict(self, prop_def: Dict[str, Any]) -> Dict[str, Any]:
        """Process a property definition dictionary"""
        schema = {}
        
        # Handle type
        if "type" in prop_def:
            schema["type"] = self._normalize_type(prop_def["type"])
        else:
            schema["type"] = "string"  # Default type
        
        # Handle description
        if "description" in prop_def:
            schema["description"] = str(prop_def["description"])
        
        # Handle enum values
        if "enum" in prop_def and isinstance(prop_def["enum"], list):
            schema["enum"] = prop_def["enum"]
        
        # Handle default values
        if "default" in prop_def:
            schema["default"] = prop_def["default"]
        
        # Handle array items
        if schema["type"] == "array" and "items" in prop_def:
            schema["items"] = self._generate_property_schema(prop_def["items"])
        
        # Handle object properties
        if schema["type"] == "object" and "properties" in prop_def:
            schema["properties"] = {}
            for nested_name, nested_def in prop_def["properties"].items():
                schema["properties"][nested_name] = self._generate_property_schema(nested_def)
        
        # Handle string constraints
        if schema["type"] == "string":
            if "minLength" in prop_def:
                schema["minLength"] = int(prop_def["minLength"])
            if "maxLength" in prop_def:
                schema["maxLength"] = int(prop_def["maxLength"])
            if "pattern" in prop_def:
                schema["pattern"] = str(prop_def["pattern"])
        
        # Handle number constraints
        if schema["type"] in ["integer", "number"]:
            if "minimum" in prop_def:
                schema["minimum"] = prop_def["minimum"]
            if "maximum" in prop_def:
                schema["maximum"] = prop_def["maximum"]
        
        return schema
    
    def _normalize_type(self, type_value: Union[str, type]) -> str:
        """Normalize type value to JSON schema type"""
        if isinstance(type_value, type):
            type_str = type_value.__name__
        else:
            type_str = str(type_value).lower()
        
        return self.type_mapping.get(type_str, "string")
    
    def _infer_type(self, value: Any) -> str:
        """Infer JSON schema type from Python value"""
        if isinstance(value, bool):
            return "boolean"
        elif isinstance(value, int):
            return "integer"
        elif isinstance(value, float):
            return "number"
        elif isinstance(value, list):
            return "array"
        elif isinstance(value, dict):
            return "object"
        else:
            return "string"
    
    def validate_schema(self, schema: Dict[str, Any]) -> bool:
        """
        Validate that a schema is properly formatted
        
        Args:
            schema: JSON schema to validate
            
        Returns:
            True if schema is valid, False otherwise
        """
        try:
            # Basic validation checks
            if not isinstance(schema, dict):
                return False
            
            if "type" not in schema:
                return False
            
            valid_types = ["string", "integer", "number", "boolean", "array", "object", "null"]
            if schema["type"] not in valid_types:
                return False
            
            # Validate properties if object type
            if schema["type"] == "object":
                if "properties" in schema:
                    if not isinstance(schema["properties"], dict):
                        return False
                    
                    # Recursively validate nested properties
                    for prop_schema in schema["properties"].values():
                        if not self.validate_schema(prop_schema):
                            return False
            
            # Validate array items
            if schema["type"] == "array":
                if "items" in schema:
                    if not self.validate_schema(schema["items"]):
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f"Schema validation error: {str(e)}")
            return False