"""
Template manager for different tool types
"""
from typing import Dict, Any
from ..models.tool_spec import ToolType


class ToolTemplateManager:
    """Manages templates for different tool types"""
    
    def __init__(self):
        self._templates = {}
        self._load_templates()
    
    def _load_templates(self):
        """Load all tool templates"""
        self._templates[ToolType.FRONTEND_ACTION] = self._get_frontend_action_template()
        self._templates[ToolType.CODE_EXECUTION] = self._get_code_execution_template()
        self._templates[ToolType.AGENT_TOOL] = self._get_agent_tool_template()
        self._templates[ToolType.AGENT_TOOL] = self._get_agent_tool_template()
    
    def get_template(self, tool_type: ToolType) -> str:
        """Get template for specified tool type"""
        template = self._templates.get(tool_type)
        if not template:
            raise ValueError(f"No template found for tool type: {tool_type}")
        return template
    
    def get_available_types(self) -> list:
        """Get list of available tool types"""
        return list(self._templates.keys())
    
    def _get_frontend_action_template(self) -> str:
        """Template for frontend action tools"""
        return '''# {tool_name}.py

import os
import requests
import time
from strands import tool
from typing import Dict, Any{type_imports}


@tool
def {tool_name}({function_signature}) -> Dict[str, Any]:
    """
    {tool_description}
    
    Args:
{args_documentation}
    
    Returns:
        Result from frontend action execution
    """
    # Get backend URL from environment
    backend_url = os.getenv('BACKEND_URL', 'https://your-backend-url')
    timeout_seconds = int(os.getenv('TIMEOUT_SECONDS', '30'))
    
    # Create payload for frontend action
    payload = {{
        "action": "{tool_name}",
        "parameters": {{{parameter_dict}}}
    }}
    
    try:
        # Send frontend action to middle backend
        response = requests.post(
            f"{{backend_url}}/api/frontend-action",
            json=payload,
            timeout=timeout_seconds
        )
        response.raise_for_status()
        
        # Get the response data
        result = response.json()
        
        # Return the result from frontend
        return {{
            "success": result.get("success", True),
            "data": result.get("data", {{}})
        }}
        
    except requests.exceptions.Timeout:
        return {{
            "success": False,
            "error": "Frontend action timed out after 30 seconds"
        }}
    except requests.exceptions.RequestException as e:
        return {{
            "success": False,
            "error": f"Failed to communicate with middle backend: {{str(e)}}"
        }}
    except Exception as e:
        return {{
            "success": False,
            "error": f"Unexpected error in frontend action: {{str(e)}}"
        }}
'''
    
    def _get_code_execution_template(self) -> str:
        """Template for code execution tools"""
        return '''"""
Auto-generated code execution tool: {tool_name}
Description: {tool_description}

This tool executes code logic (structure prepared for AWS Agent Core code interpreter).
"""
import json
from typing import Dict, Any, Union


# Tool specification for registration
TOOL_SPEC = {tool_spec_json}


def _validate_type(value: Any, expected_type: str) -> bool:
    """Validate that value matches expected JSON schema type"""
    type_mapping = {{
        'string': str,
        'integer': int,
        'number': (int, float),
        'boolean': bool,
        'array': list,
        'object': dict,
        'null': type(None)
    }}
    
    expected_python_type = type_mapping.get(expected_type)
    if expected_python_type is None:
        return True  # Unknown type, skip validation
    
    return isinstance(value, expected_python_type)


def _validate_enum(value: Any, enum_values: list) -> bool:
    """Validate that value is in allowed enum values"""
    return value in enum_values


def {tool_name}(tool: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    """
    {tool_description}
    
    This is a code execution tool that runs actual code logic.
    Structure is prepared for AWS Agent Core code interpreter integration.
    
    Args:
        tool: Tool invocation data containing toolUseId and input
        **kwargs: Additional keyword arguments
        
    Returns:
        Tool execution result dictionary
        
    Raises:
        ValueError: If required fields are missing or validation fails
    """
    try:
{validation_code}
        
{execution_code}
        
    except Exception as e:
        # Return error response
        return {{
            'toolUseId': tool.get('toolUseId'),
            'status': 'error',
            'error': str(e),
            'content': [{{'text': f'Error executing {tool_name}: {{str(e)}}'}}]
        }}


# Export the tool function for dynamic loading
__tool_function__ = {tool_name}
__tool_spec__ = TOOL_SPEC
'''
    
    def _get_agent_tool_template(self) -> str:
        """Template for agent tools (sub-agents)"""
        return '''# {tool_name}.py

from strands import Agent, tool
from strands.models import BedrockModel{builtin_imports}{generated_imports}{agent_imports}
from typing import Dict, Any{type_imports}


# Define specialized system prompt for this agent
{tool_name_upper}_SYSTEM_PROMPT = """
{system_prompt}
"""

# Initialize model for this agent
{tool_name}_model = BedrockModel(
    region_name="{model_region}",
    model_id="{model_id}"
)


@tool
def {tool_name}({function_signature}) -> str:
    """
    {tool_description}
    
    Args:
{args_documentation}
    
    Returns:
        Response from the specialized agent
    """
    try:
        # Create specialized agent with specific tools and model
        specialized_agent = Agent(
            model={tool_name}_model,
            system_prompt={tool_name_upper}_SYSTEM_PROMPT,
            tools=[{tools_list}]
        )
        
        # Prepare formatted query for the agent
        formatted_query = f"""
Query: You are an Voice AI Agent. The user cannot see the text response, only hear you via the tool calls, speak_to_user (before end of turn) and ask_user. Make it a good conversational flow while doing the work, so the user does not feel the latency as you perform the tasks. Only use ONE TOOL at a time, otherwise it will be messed up.  {{{query_parameter}}}
"""
        
        # Call the agent and return its response
        response = specialized_agent(formatted_query.strip())
        return str(response)
        
    except Exception as e:
        return f"Error in {tool_name}: {{str(e)}}"
'''