"""
Agent specification transformer - converts frontend agent data into AgentSpecification objects
"""
import logging
from typing import Dict, Any, List
from ..models.tool_spec import AgentSpecification, AgentToolConfig, ToolInputSchema
from .agent_schema import validate_agent_config

logger = logging.getLogger(__name__)


class AgentSpecTransformer:
    """Transforms frontend agent data into standardized agent specifications"""
    
    def transform_agent_data(self, agent_data: Dict[str, Any]) -> AgentSpecification:
        """
        Transform frontend agent data into AgentSpecification
        
        Args:
            agent_data: Frontend agent configuration data
            
        Returns:
            AgentSpecification object
            
        Raises:
            ValueError: If agent data is invalid
        """
        try:
            # Validate the agent configuration
            validate_agent_config(agent_data)
            
            # Extract basic agent info
            name = agent_data["name"]
            description = agent_data["description"]
            system_prompt = agent_data["system_prompt"]
            
            # Transform tools
            tools = self._transform_tools(agent_data["tools"])
            
            # Transform input schema
            input_schema_data = agent_data.get("inputSchema", {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Query or message for the agent"
                    }
                },
                "required": ["query"]
            })
            
            input_schema = ToolInputSchema(
                type=input_schema_data.get("type", "object"),
                properties=input_schema_data.get("properties", {}),
                required=input_schema_data.get("required", [])
            )
            
            agent_spec = AgentSpecification(
                name=name,
                description=description,
                system_prompt=system_prompt,
                tools=tools,
                input_schema=input_schema
            )
            
            logger.info(f"Successfully transformed agent specification: {name}")
            return agent_spec
            
        except Exception as e:
            logger.error(f"Failed to transform agent data: {str(e)}")
            raise ValueError(f"Invalid agent configuration: {str(e)}")
    
    def _transform_tools(self, tools_data: List[Dict[str, Any]]) -> List[AgentToolConfig]:
        """Transform tools data into AgentToolConfig objects"""
        tools = []
        
        for tool_data in tools_data:
            tool_type = tool_data["type"]
            name = tool_data["name"]
            
            if tool_type == "builtin":
                # Built-in tools (like retrieve, http_request)
                tool_config = AgentToolConfig(
                    tool_type="builtin",
                    name=name
                )
                
            elif tool_type == "frontend":
                # Frontend action tools
                description = tool_data["description"]
                input_schema_data = tool_data["inputSchema"]
                
                input_schema = ToolInputSchema(
                    type=input_schema_data.get("type", "object"),
                    properties=input_schema_data.get("properties", {}),
                    required=input_schema_data.get("required", [])
                )
                
                tool_config = AgentToolConfig(
                    tool_type="frontend",
                    name=name,
                    description=description,
                    input_schema=input_schema
                )
                
            elif tool_type == "code":
                # Code execution tools
                description = tool_data["description"]
                code = tool_data["code"]
                input_schema_data = tool_data["inputSchema"]
                
                input_schema = ToolInputSchema(
                    type=input_schema_data.get("type", "object"),
                    properties=input_schema_data.get("properties", {}),
                    required=input_schema_data.get("required", [])
                )
                
                tool_config = AgentToolConfig(
                    tool_type="code",
                    name=name,
                    description=description,
                    code=code,
                    input_schema=input_schema
                )
                
            else:
                raise ValueError(f"Unknown tool type: {tool_type}")
            
            tools.append(tool_config)
        
        return tools