"""
Main application entry point for Dynamic Strands System
Processes frontend configuration data and generates AWS deployment packages
"""
import json
import logging
import sys
from pathlib import Path
from typing import Dict, Any, List

from .config.settings import settings
from .dynamic_tool_generator.engine import DynamicToolGenerationEngine
from .deployment.package_generator import DeploymentPackageGenerator

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format=settings.log_format
)

logger = logging.getLogger(__name__)


class DynamicStrandsService:
    """Main service for processing frontend data and generating deployments"""
    
    def __init__(self):
        """Initialize the service"""
        from .dynamic_tool_generator.tool_spec_transformer import ToolSpecTransformer
        from .dynamic_tool_generator.module_generator import PythonModuleGenerator
        
        self.transformer = ToolSpecTransformer()
        self.generator = PythonModuleGenerator()
        self.package_generator = DeploymentPackageGenerator()
        logger.info("Dynamic Strands Service initialized")
    
    def process_frontend_configuration(self, config_data: Dict[str, Any]) -> str:
        """
        Process frontend configuration and generate deployment package
        
        Args:
            config_data: Configuration from frontend containing agents and tools
            
        Returns:
            Path to generated deployment package
        """
        try:
            logger.info("Processing frontend configuration...")
            
            # Extract configuration sections
            agents_config = config_data.get("agents", [])
            tools_config = config_data.get("tools", [])
            main_agent_config = config_data.get("main_agent", {})
            environment_vars = config_data.get("environment", {})
            
            # Create generated directories
            Path("generated/agents").mkdir(parents=True, exist_ok=True)
            Path("generated/tools").mkdir(parents=True, exist_ok=True)
            
            # Generate tools from frontend specifications
            logger.info(f"Generating {len(tools_config)} tools...")
            generated_tools = []
            for tool_spec in tools_config:
                tool_name = self._generate_tool_file(tool_spec)
                generated_tools.append(tool_name)
                logger.debug(f"Generated tool: {tool_name}")
            
            # Generate agents from frontend specifications  
            logger.info(f"Generating {len(agents_config)} agents...")
            generated_agents = []
            for agent_spec in agents_config:
                agent_name = self._generate_agent_file(agent_spec)
                generated_agents.append(agent_name)
                logger.debug(f"Generated agent: {agent_name}")
            
            # Create deployment package
            logger.info("Creating deployment package...")
            deployment_path = self.package_generator.create_deployment_package(
                main_agent_config=main_agent_config,
                agent_tools=generated_agents,
                frontend_tools=generated_tools,
                environment_vars=environment_vars
            )
            
            logger.info(f"Successfully created deployment package: {deployment_path}")
            return str(deployment_path)
            
        except Exception as e:
            logger.error(f"Failed to process configuration: {str(e)}")
            raise
    
    def process_configuration_file(self, config_file_path: str) -> str:
        """
        Process configuration from a JSON file
        
        Args:
            config_file_path: Path to JSON configuration file
            
        Returns:
            Path to generated deployment package
        """
        try:
            logger.info(f"Loading configuration from: {config_file_path}")
            
            with open(config_file_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            return self.process_frontend_configuration(config_data)
            
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {config_file_path}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in configuration file: {e}")
            raise
    
    def generate_sample_configuration(self, output_path: str = "sample_config.json") -> None:
        """Generate a sample configuration file for reference"""
        sample_config = {
            "main_agent": {
                "name": "main_orchestrator",
                "description": "Main orchestrator for multi-agent system",
                "system_prompt": "You are an intelligent orchestrator that routes queries to specialized agents.",
                "model": {
                    "region": "us-east-1",
                    "model_id": "us.amazon.nova-premier-v1:0"
                }
            },
            "agents": [
                {
                    "name": "research_assistant",
                    "description": "Research assistant for factual information",
                    "type": "agent_tool",
                    "system_prompt": "You are a research assistant that helps with factual information and research tasks.",
                    "tools": ["show_notification"]
                },
                {
                    "name": "customer_support_assistant", 
                    "description": "Customer support assistant",
                    "type": "agent_tool",
                    "system_prompt": "You are a customer support assistant that helps users with their questions.",
                    "tools": ["show_notification", "upload_file"]
                }
            ],
            "tools": [
                {
                    "name": "show_notification",
                    "description": "Show notification to user",
                    "type": "frontend_action",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string", "description": "Notification message"},
                            "type": {"type": "string", "description": "Notification type", "default": "info"}
                        },
                        "required": ["message"]
                    }
                },
                {
                    "name": "upload_file",
                    "description": "Prompt user to upload a file",
                    "type": "frontend_action",
                    "inputSchema": {
                        "type": "object", 
                        "properties": {
                            "title": {"type": "string", "description": "Upload dialog title"},
                            "accept": {"type": "string", "description": "File types to accept", "default": "*"}
                        },
                        "required": ["title"]
                    }
                }
            ],
            "environment": {
                "BACKEND_URL": "https://your-backend.example.com",
                "TIMEOUT_SECONDS": "30"
            }
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(sample_config, f, indent=2)
        
        logger.info(f"Generated sample configuration: {output_path}")
    
    def _generate_tool_file(self, tool_spec: Dict[str, Any]) -> str:
        """Generate a tool file from frontend specification"""
        try:
            # Transform frontend data to tool specification
            tool_specification = self.transformer.transform_frontend_data(tool_spec)
            
            # Generate the module file
            module_path = self.generator.generate_tool_module(tool_specification, "generated/tools")
            
            logger.debug(f"Generated tool file: {module_path}")
            return tool_specification.name
            
        except Exception as e:
            logger.error(f"Failed to generate tool {tool_spec.get('name', 'unknown')}: {e}")
            raise
    
    def _generate_agent_file(self, agent_spec: Dict[str, Any]) -> str:
        """Generate an agent file from frontend specification"""
        try:
            agent_name = agent_spec.get("name", "unknown_agent")
            system_prompt = agent_spec.get("system_prompt", f"You are a {agent_name} agent.") + """Do not use the speak_to_user and ask_user tool together, use only one of them, use ask_user if both were to be used, as using both will cause latency issues if used at the same time or one after the other immediately. After speech is done, do not speak again and again, the user will say something if required. Only ask_user means a response is mandatory. You communicate with the user only through conversation.
When the user indicates they are done, says no help is needed, or the goal has been completed,
END the conversation gracefully and STOP responding.

After saying a polite closing line once (if needed), do not speak again or repeat yourself. Just stop and end the turn (stop reason)
Never continue saying goodbye or asking if more help is needed repeatedly.
Do not reinitiate conversation after the user says goodbye, thanks, or declines further help. End the turn and STOP responding immediately.
"""
            tools = agent_spec.get("tools", [])
            
            # Create agent template
            agent_content = self._create_agent_template(agent_name, system_prompt, tools)
            
            # Write agent file
            agent_file_path = Path("generated/agents") / f"{agent_name}.py"
            with open(agent_file_path, 'w', encoding='utf-8') as f:
                f.write(agent_content)
            
            logger.debug(f"Generated agent file: {agent_file_path}")
            return agent_name
            
        except Exception as e:
            logger.error(f"Failed to generate agent {agent_spec.get('name', 'unknown')}: {e}")
            raise
    
    def _create_agent_template(self, agent_name: str, system_prompt: str, tools: List[str]) -> str:
        """Create agent template content"""
        
        # Generate tool imports
        tool_imports = []
        for tool in tools:
            tool_imports.append(f"from src.tools.{tool} import {tool}")
        
        # Generate tools list
        tools_list = ", ".join(tools)
        
        agent_template = f'''# {agent_name}.py
from strands import Agent, tool
from strands_tools import retrieve, http_request
{chr(10).join(tool_imports)}

@tool
def {agent_name}(query: str) -> str:
    """
    {agent_name.replace('_', ' ').title()} agent
    
    Args:
        query: User query or request
        
    Returns:
        Agent response as string
    """
    agent = Agent(
        system_prompt="""{system_prompt}""",
        tools=[retrieve, http_request{', ' + tools_list if tools else ''}]
    )
    response = agent(query)
    return str(response)
'''
        
        return agent_template


def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python -m src.main <config_file.json>  # Process configuration file")
        print("  python -m src.main --sample            # Generate sample configuration")
        print("  python -m src.main --help              # Show this help")
        return
    
    service = DynamicStrandsService()
    
    if sys.argv[1] == "--sample":
        service.generate_sample_configuration()
        print("Generated sample_config.json - edit this file with your configuration")
        return
    
    if sys.argv[1] == "--help":
        print("Dynamic Strands System - Generate AWS Agent Deployments")
        print("")
        print("Usage:")
        print("  python -m src.main <config_file.json>  # Process configuration file")
        print("  python -m src.main --sample            # Generate sample configuration")
        print("")
        print("Configuration file should contain:")
        print("  - main_agent: Main orchestrator configuration")
        print("  - agents: List of agent specifications")
        print("  - tools: List of tool specifications")
        print("  - environment: Environment variables")
        return
    
    config_file = sys.argv[1]
    
    try:
        deployment_path = service.process_configuration_file(config_file)
        print(f"✅ Deployment package created: {deployment_path}")
        print(f"📁 Navigate to {deployment_path} and follow README.md for deployment instructions")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()