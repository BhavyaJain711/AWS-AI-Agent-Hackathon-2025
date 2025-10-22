"""
Frontend data schema definitions for dynamic tool generation

Frontend Action Tools:
- Generated tools make HTTP calls to a middle backend server
- The middle backend handles WebSocket/SSE communication with the frontend
- Tools wait for actual frontend execution and return the response
- Environment variables control backend URL and timeout settings

Required Environment Variables:
- BACKEND_URL: URL of the middle backend server (default: https://your-backend-url)
- TIMEOUT_SECONDS: HTTP request timeout in seconds (default: 30)

Expected API Contract:
POST /api/frontend-action
{
  "action": "tool_name",
  "parameters": {...}
}

Response:
{
  "success": true,
  "data": {...}
}
"""
from typing import Dict, Any


# Expected frontend data format for tool generation
FRONTEND_TOOL_SCHEMA = {
    "type": "object",
    "required": ["name", "description", "type"],
    "properties": {
        "name": {
            "type": "string",
            "description": "Tool name (will be sanitized for Python function naming)",
            "minLength": 1
        },
        "description": {
            "type": "string", 
            "description": "Tool description",
            "minLength": 1
        },
        "type": {
            "type": "string",
            "enum": ["frontend_action", "code_execution"],
            "description": "Type of tool to generate"
        },
        "inputSchema": {
            "type": "object",
            "description": "JSON schema for tool input validation (optional)",
            "properties": {
                "type": {
                    "type": "string",
                    "default": "object",
                    "enum": ["object", "array", "string", "number", "integer", "boolean"]
                },
                "properties": {
                    "type": "object",
                    "description": "Property definitions for object type",
                    "additionalProperties": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string"},
                            "description": {"type": "string"},
                            "enum": {"type": "array"},
                            "default": {}
                        }
                    }
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


# Example valid frontend data
EXAMPLE_FRONTEND_ACTION = {
    "name": "show_confirmation_dialog",
    "description": "Show a confirmation dialog to the user and wait for their response",
    "type": "frontend_action",
    "inputSchema": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Dialog title"
            },
            "message": {
                "type": "string",
                "description": "Dialog message"
            },
            "confirmText": {
                "type": "string",
                "description": "Text for confirm button",
                "default": "OK"
            },
            "cancelText": {
                "type": "string",
                "description": "Text for cancel button",
                "default": "Cancel"
            }
        },
        "required": ["title", "message"]
    }
}

EXAMPLE_CODE_EXECUTION = {
    "name": "calculate_sum",
    "description": "Calculate the sum of two numbers",
    "type": "code_execution", 
    "inputSchema": {
        "type": "object",
        "properties": {
            "a": {
                "type": "number",
                "description": "First number"
            },
            "b": {
                "type": "number", 
                "description": "Second number"
            }
        },
        "required": ["a", "b"]
    }
}


def get_schema() -> Dict[str, Any]:
    """Get the frontend tool schema"""
    return FRONTEND_TOOL_SCHEMA


def get_examples() -> Dict[str, Dict[str, Any]]:
    """Get example frontend data for different tool types"""
    return {
        "frontend_action": EXAMPLE_FRONTEND_ACTION,
        "code_execution": EXAMPLE_CODE_EXECUTION
    }


def get_additional_examples() -> Dict[str, Dict[str, Any]]:
    """Get additional example frontend actions for common use cases"""
    return {
        "file_upload": {
            "name": "upload_file",
            "description": "Prompt user to upload a file and return file information",
            "type": "frontend_action",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "accept": {
                        "type": "string",
                        "description": "Accepted file types (e.g., '.pdf,.doc,.txt')",
                        "default": "*"
                    },
                    "maxSize": {
                        "type": "integer",
                        "description": "Maximum file size in bytes",
                        "default": 10485760
                    },
                    "multiple": {
                        "type": "boolean",
                        "description": "Allow multiple file selection",
                        "default": False
                    }
                },
                "required": []
            }
        },
        "form_input": {
            "name": "collect_user_info",
            "description": "Show a form to collect user information",
            "type": "frontend_action",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "fields": {
                        "type": "array",
                        "description": "Form fields to display",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "label": {"type": "string"},
                                "type": {"type": "string", "enum": ["text", "email", "number", "select"]},
                                "required": {"type": "boolean", "default": False}
                            }
                        }
                    },
                    "title": {
                        "type": "string",
                        "description": "Form title"
                    }
                },
                "required": ["fields", "title"]
            }
        },
        "notification": {
            "name": "show_notification",
            "description": "Display a notification message to the user",
            "type": "frontend_action",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "Notification message"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["success", "info", "warning", "error"],
                        "description": "Notification type",
                        "default": "info"
                    },
                    "duration": {
                        "type": "integer",
                        "description": "Duration in milliseconds (0 for persistent)",
                        "default": 5000
                    }
                },
                "required": ["message"]
            }
        }
    }