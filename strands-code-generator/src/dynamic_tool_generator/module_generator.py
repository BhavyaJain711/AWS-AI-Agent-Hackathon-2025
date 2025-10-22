"""
Python module generator - creates Python tool modules from specifications
"""
import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
import logging

from ..models.tool_spec import ToolSpecification, ToolType
from .template_manager import ToolTemplateManager

logger = logging.getLogger(__name__)


class PythonModuleGenerator:
    """Generates Python tool modules from tool specifications"""
    
    def __init__(self):
        self.template_manager = ToolTemplateManager()
    
    def generate_default_tools(self, output_dir: str = "generated/tools") -> list:
        """
        Generate default tools that are automatically available to all agents
        
        Args:
            output_dir: Directory to write the tool modules
            
        Returns:
            List of generated default tool names
        """
        default_tools = [
            {
                "name": "ask_user",
                "description": "Ask the user a question and wait for their response (Uses TTS Service)",
                "type": "frontend_action",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "question": {
                            "type": "string",
                            "description": "The question to ask the user"
                        }
                    },
                    "required": ["question"]
                }
            },
            {
                "name": "speak_to_user",
                "description": "Speak a short message to the user (Uses TTS Service). This is for just before ending the turn.",
                "type": "frontend_action",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "The message to display to the user"
                        }
                    },
                    "required": ["message"]
                }
            }
        ]
        
        generated_tool_names = []
        
        # Import transformer here to avoid circular imports
        from .tool_spec_transformer import ToolSpecTransformer
        transformer = ToolSpecTransformer()
        
        for tool_data in default_tools:
            try:
                # Transform and generate the tool
                tool_spec = transformer.transform_frontend_data(tool_data)
                self.generate_tool_module(tool_spec, output_dir)
                generated_tool_names.append(tool_data["name"])
                logger.info(f"Generated default tool: {tool_data['name']}")
            except Exception as e:
                logger.error(f"Failed to generate default tool {tool_data['name']}: {e}")
                raise
        
        return generated_tool_names
    
    def generate_tool_module(self, tool_spec: ToolSpecification, output_dir: str) -> Path:
        """
        Generate Python module file from tool specification
        
        Args:
            tool_spec: Tool specification to generate module from
            output_dir: Directory to write the module file
            
        Returns:
            Path to the generated module file
        """
        try:
            # Ensure output directory exists
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            # Generate module content
            module_content = self._generate_module_content(tool_spec)
            
            # Write module file
            module_filename = f"{tool_spec.name}.py"
            module_path = output_path / module_filename
            
            with open(module_path, 'w', encoding='utf-8') as f:
                f.write(module_content)
            
            logger.info(f"Generated tool module: {module_path}")
            return module_path
            
        except Exception as e:
            logger.error(f"Failed to generate tool module for {tool_spec.name}: {str(e)}")
            raise
    
    def _generate_module_content(self, tool_spec: ToolSpecification) -> str:
        """Generate the complete module content for a tool"""
        template = self.template_manager.get_template(tool_spec.tool_type)
        
        # Prepare template variables
        template_vars = {
            'tool_name': tool_spec.name,
            'tool_description': tool_spec.description,
            'tool_spec_json': json.dumps(tool_spec.to_dict(), indent=4),
            'input_schema_json': json.dumps(tool_spec.input_schema.__dict__, indent=4)
        }
        
        # For frontend actions and agent tools, generate function signature and documentation
        if tool_spec.tool_type == ToolType.FRONTEND_ACTION:
            template_vars.update(self._generate_function_signature_vars(tool_spec))
        elif tool_spec.tool_type == ToolType.AGENT_TOOL:
            template_vars.update(self._generate_agent_tool_vars(tool_spec))
        else:
            # Add execution code for other tool types
            template_vars['validation_code'] = self._generate_validation_code(tool_spec)
            template_vars['execution_code'] = self._generate_execution_code(tool_spec)
        
        # Replace template variables
        return template.format(**template_vars)
    
    def _generate_validation_code(self, tool_spec: ToolSpecification) -> str:
        """Generate input validation code for the tool"""
        validation_lines = []
        
        # For frontend actions, keep validation simple
        if tool_spec.tool_type == ToolType.FRONTEND_ACTION:
            if tool_spec.input_schema.required:
                validation_lines.append("    # Validate required parameters")
                for required_field in tool_spec.input_schema.required:
                    validation_lines.append(f"    if '{required_field}' not in tool_input:")
                    validation_lines.append(f"        raise ValueError('Required parameter \"{required_field}\" is missing')")
            else:
                validation_lines.append("    # No validation required")
        else:
            # More complex validation for other tool types
            validation_lines.append("    # Validate required fields")
            if tool_spec.input_schema.required:
                for required_field in tool_spec.input_schema.required:
                    validation_lines.append(f"    if '{required_field}' not in tool_input:")
                    validation_lines.append(f"        raise ValueError('Required field \"{required_field}\" is missing')")
        
        return "\n".join(validation_lines)
    
    def _generate_execution_code(self, tool_spec: ToolSpecification) -> str:
        """Generate execution code based on tool type"""
        if tool_spec.tool_type == ToolType.FRONTEND_ACTION:
            return self._generate_frontend_action_code(tool_spec)
        elif tool_spec.tool_type == ToolType.CODE_EXECUTION:
            return self._generate_code_execution_code(tool_spec)
        else:
            raise ValueError(f"Unknown tool type: {tool_spec.tool_type}")
    
    def _generate_frontend_action_code(self, tool_spec: ToolSpecification) -> str:
        """Generate execution code for frontend action tools"""
        lines = []
        lines.append("        # Transform input for frontend action")
        lines.append("        payload = {")
        lines.append(f"            'action': '{tool_spec.name}',")
        lines.append("            'parameters': input_data,")
        lines.append("            'toolUseId': tool_use_id")
        lines.append("        }")
        lines.append("")
        lines.append("        # Return frontend action response")
        lines.append("        return {")
        lines.append("            'type': 'frontend_action',")
        lines.append("            'data': payload")
        lines.append("        }")
        
        return "\n".join(lines)
    
    def _generate_code_execution_code(self, tool_spec: ToolSpecification) -> str:
        """Generate execution code for code execution tools"""
        lines = []
        lines.append("        # Code execution logic (structure prepared for AWS Agent Core code interpreter)")
        lines.append("        # TODO: Implement actual code execution when AWS Agent Core integration is added")
        lines.append("")
        lines.append("        # For now, return a placeholder response")
        tool_name = tool_spec.name
        lines.append(f"        result = f'Code execution for {tool_name} with input: {{input_data}}'")
        lines.append("")
        lines.append("        return {")
        lines.append("            'toolUseId': tool_use_id,")
        lines.append("            'status': 'success',")
        lines.append("            'content': [{'text': result}]")
        lines.append("        }")
        
        return "\n".join(lines)
    
    def _generate_function_signature_vars(self, tool_spec: ToolSpecification) -> dict:
        """Generate function signature variables for @tool decorator approach"""
        properties = tool_spec.input_schema.properties or {}
        required_fields = tool_spec.input_schema.required or []
        
        # Generate function parameters
        params = []
        param_dict_items = []
        args_docs = []
        type_imports = set()
        
        for param_name, param_def in properties.items():
            if isinstance(param_def, dict):
                # Determine Python type from JSON schema type
                param_type = self._json_type_to_python_type(param_def.get('type', 'string'))
                
                # Add type import if needed
                if param_type in ['List[Any]', 'Dict[str, Any]']:
                    type_imports.add('List')
                    type_imports.add('Dict')
                
                # Handle optional parameters
                if param_name not in required_fields:
                    if 'default' in param_def:
                        default_value = repr(param_def['default'])
                    else:
                        default_value = 'None'
                        param_type = f'Optional[{param_type}]'
                        type_imports.add('Optional')
                    
                    params.append(f'{param_name}: {param_type} = {default_value}')
                else:
                    params.append(f'{param_name}: {param_type}')
                
                # Add to parameter dictionary
                param_dict_items.append(f'"{param_name}": {param_name}')
                
                # Add to args documentation
                description = param_def.get('description', f'The {param_name} parameter')
                args_docs.append(f'        {param_name}: {description}')
        
        # Create function signature
        function_signature = ', '.join(params) if params else ''
        
        # Create parameter dictionary string
        parameter_dict = ', '.join(param_dict_items) if param_dict_items else ''
        
        # Create args documentation
        args_documentation = '\n'.join(args_docs) if args_docs else '        No parameters required'
        
        # Create type imports
        type_imports_str = ''
        if type_imports:
            type_imports_str = ', ' + ', '.join(sorted(type_imports))
        
        return {
            'function_signature': function_signature,
            'parameter_dict': parameter_dict,
            'args_documentation': args_documentation,
            'type_imports': type_imports_str
        }
    
    def _json_type_to_python_type(self, json_type: str) -> str:
        """Convert JSON schema type to Python type annotation"""
        type_mapping = {
            'string': 'str',
            'integer': 'int',
            'number': 'float',
            'boolean': 'bool',
            'array': 'List[Any]',
            'object': 'Dict[str, Any]',
            'null': 'None'
        }
        return type_mapping.get(json_type, 'str')
    
    def _generate_agent_tool_vars(self, tool_spec: ToolSpecification) -> dict:
        """Generate variables for agent tool template"""
        # Get agent-specific data from frontend_data
        frontend_data = tool_spec.frontend_data or {}
        system_prompt = frontend_data.get('system_prompt', f'You are a specialized {tool_spec.name} agent.') + """Do not use the speak_to_user and ask_user tool together, use only one of them, use ask_user if both were to be used, as using both will cause latency issues if used at the same time or one after the other immediately. After speech is done, do not speak again and again, the user will say something if required. Only ask_user means a response is mandatory. You communicate with the user only through conversation.
When the user indicates they are done, says no help is needed, or the goal has been completed,
END the conversation by ending the turn.

After saying a polite closing line once (if needed), do not speak again or repeat yourself. Just stop and end the turn (stop reason)
Never continue saying goodbye or asking if more help is needed repeatedly.
Do not reinitiate conversation after the user says goodbye, thanks, or declines further help. End the turn and STOP responding immediately.
"""
        builtin_tools = frontend_data.get('builtin_tools', [])
        generated_tools = frontend_data.get('tools', [])
        agent_tools = frontend_data.get('agent_tools', [])  # Other agents this agent can call
        
        # Get model configuration (with defaults)
        model_config = frontend_data.get('model', {})
        model_region = model_config.get('region', 'us-east-1')
        model_id = model_config.get('model_id', 'us.amazon.nova-premier-v1:0')
        
        # For agent tools, always ensure there's a query parameter
        # If no inputSchema is provided, use default query parameter
        properties = tool_spec.input_schema.properties or {}
        if not properties:
            # Set default function signature for agents
            function_signature = 'query: str'
            args_documentation = '        query: User query or request'
            type_imports = ''
            query_parameter = 'query'
        else:
            # Get basic function signature vars from inputSchema
            base_vars = self._generate_function_signature_vars(tool_spec)
            function_signature = base_vars['function_signature']
            args_documentation = base_vars['args_documentation']
            type_imports = base_vars['type_imports']
            # Use first parameter as query parameter
            query_parameter = list(properties.keys())[0]
        
        # Generate imports for builtin tools
        builtin_imports = ''
        if builtin_tools:
            builtin_imports = f'\nfrom strands_tools import {", ".join(builtin_tools)}'
        
        # Generate imports for generated tools (frontend actions)
        generated_imports = ''
        if generated_tools:
            import_lines = [f'from src.tools.{tool} import {tool}' for tool in generated_tools]
            generated_imports = '\n' + '\n'.join(import_lines)
        
        # Generate imports for agent tools (other agents from agents directory)
        agent_imports = ''
        if agent_tools:
            # Import from parent directory since agents are in src/agents/
            import_lines = [f'from src.agents.{agent} import {agent}' for agent in agent_tools]
            agent_imports = '\n' + '\n'.join(import_lines)
        
        # Generate tools list for agent (all tools combined)
        all_tools_list = builtin_tools + generated_tools + agent_tools
        tools_list_str = ', '.join(all_tools_list) if all_tools_list else ''
        
        # Return all template variables
        return {
            'tool_name': tool_spec.name,
            'tool_description': tool_spec.description,
            'tool_name_upper': tool_spec.name.upper(),
            'system_prompt': system_prompt,
            'builtin_imports': builtin_imports,
            'generated_imports': generated_imports,
            'agent_imports': agent_imports,
            'tools_list': tools_list_str,
            'query_parameter': query_parameter,
            'model_region': model_region,
            'model_id': model_id,
            'function_signature': function_signature,
            'args_documentation': args_documentation,
            'type_imports': type_imports
        }