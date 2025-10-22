"""
Agent configuration schema for frontend data validation
"""
from typing import Dict, Any, List, Optional, Union


# Agent configuration schema
AGENT_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "description": "Agent name (used for function name)",
            "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$"
        },
        "description": {
            "type": "string",
            "description": "Agent description"
        },
        "system_prompt": {
            "type": "string",
            "description": "System prompt for the agent"
        },
        "tools": {
            "type": "array",
            "description": "List of tools available to the agent",
            "items": {
                "oneOf": [
                    {
                        "type": "object",
                        "properties": {
                            "type": {"const": "builtin"},
                            "name": {
                                "type": "string",
                                "description": "Built-in tool name (e.g., 'retrieve', 'http_request')"
                            }
                        },
                        "required": ["type", "name"],
                        "additionalProperties": False
                    },
                    {
                        "type": "object",
                        "properties": {
                            "type": {"const": "frontend"},
                            "name": {
                                "type": "string",
                                "description": "Frontend tool name"
                            },
                            "description": {
                                "type": "string",
                                "description": "Tool description"
                            },
                            "inputSchema": {
                                "type": "object",
                                "description": "JSON schema for tool input validation"
                            }
                        },
                        "required": ["type", "name", "description", "inputSchema"],
                        "additionalProperties": False
                    },
                    {
                        "type": "object",
                        "properties": {
                            "type": {"const": "code"},
                            "name": {
                                "type": "string",
                                "description": "Code execution tool name"
                            },
                            "description": {
                                "type": "string",
                                "description": "Tool description"
                            },
                            "code": {
                                "type": "string",
                                "description": "Python code to execute"
                            },
                            "inputSchema": {
                                "type": "object",
                                "description": "JSON schema for tool input validation"
                            }
                        },
                        "required": ["type", "name", "description", "code", "inputSchema"],
                        "additionalProperties": False
                    }
                ]
            }
        },
        "inputSchema": {
            "type": "object",
            "description": "JSON schema for agent input parameters",
            "default": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Query or message for the agent"
                    }
                },
                "required": ["query"]
            }
        }
    },
    "required": ["name", "description", "system_prompt", "tools"],
    "additionalProperties": False
}


# Example agent configurations
EXAMPLE_RESEARCH_AGENT = {
    "name": "research_assistant",
    "description": "A specialized research assistant that provides factual information",
    "system_prompt": """You are a specialized research assistant. Focus only on providing factual, well-sourced information in response to research questions. Always cite your sources when possible.""",
    "tools": [
        {
            "type": "builtin",
            "name": "retrieve"
        },
        {
            "type": "builtin", 
            "name": "http_request"
        }
    ],
    "inputSchema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "A research question requiring factual information"
            }
        },
        "required": ["query"]
    }
}

EXAMPLE_UI_AGENT = {
    "name": "ui_controller",
    "description": "Agent that controls UI elements and shows notifications",
    "system_prompt": """You are a UI controller agent. You can show notifications, modals, and other UI elements to help users. Always provide clear and helpful messages.""",
    "tools": [
        {
            "type": "frontend",
            "name": "show_notification",
            "description": "Show a notification to the user",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "Notification message"},
                    "type": {"type": "string", "enum": ["info", "warning", "error"], "description": "Notification type"}
                },
                "required": ["message", "type"]
            }
        },
        {
            "type": "frontend",
            "name": "show_modal",
            "description": "Show a modal dialog",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Modal title"},
                    "message": {"type": "string", "description": "Modal message"}
                },
                "required": ["title", "message"]
            }
        }
    ]
}

EXAMPLE_DATA_ANALYST = {
    "name": "data_analyst",
    "description": "Agent that analyzes data using Python code execution",
    "system_prompt": """You are a data analyst. You can analyze data, create visualizations, and perform statistical calculations using Python code.""",
    "tools": [
        {
            "type": "code",
            "name": "analyze_data",
            "description": "Analyze data using pandas and numpy",
            "code": """
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def analyze_data(data_csv: str, analysis_type: str):
    # Load data from CSV string
    from io import StringIO
    df = pd.read_csv(StringIO(data_csv))
    
    if analysis_type == "summary":
        return df.describe().to_string()
    elif analysis_type == "correlation":
        return df.corr().to_string()
    else:
        return "Unknown analysis type"

# Execute the analysis
result = analyze_data(data_csv, analysis_type)
return result
""",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "data_csv": {"type": "string", "description": "CSV data as string"},
                    "analysis_type": {"type": "string", "enum": ["summary", "correlation"], "description": "Type of analysis"}
                },
                "required": ["data_csv", "analysis_type"]
            }
        }
    ]
}


def get_example_agents() -> Dict[str, Dict[str, Any]]:
    """Get example agent configurations for different use cases"""
    return {
        "research": EXAMPLE_RESEARCH_AGENT,
        "ui_controller": EXAMPLE_UI_AGENT,
        "data_analyst": EXAMPLE_DATA_ANALYST
    }


def validate_agent_config(agent_config: Dict[str, Any]) -> bool:
    """
    Validate agent configuration against schema
    
    Args:
        agent_config: Agent configuration to validate
        
    Returns:
        True if valid, raises ValueError if invalid
    """
    import jsonschema
    
    try:
        jsonschema.validate(agent_config, AGENT_SCHEMA)
        return True
    except jsonschema.ValidationError as e:
        raise ValueError(f"Invalid agent configuration: {e.message}")