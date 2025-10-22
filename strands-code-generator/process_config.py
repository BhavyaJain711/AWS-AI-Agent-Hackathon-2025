#!/usr/bin/env python3
"""
Process configuration file and generate deployment package
Uses the Dynamic Strands System codebase to create deployments
"""
import json
import logging
from pathlib import Path
from src.dynamic_tool_generator.tool_spec_transformer import ToolSpecTransformer
from src.dynamic_tool_generator.module_generator import PythonModuleGenerator
from src.deployment.package_generator import DeploymentPackageGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def process_configuration(config_file_path: str) -> str:
    """
    Process JSON configuration and generate deployment package
    
    Args:
        config_file_path: Path to JSON configuration file
        
    Returns:
        Path to generated deployment package
    """
    logger.info(f"Loading configuration from: {config_file_path}")
    
    # Load configuration
    with open(config_file_path, 'r', encoding='utf-8') as f:
        config_data = json.load(f)
    
    # Extract configuration sections
    agents_config = config_data.get("agents", [])
    tools_config = config_data.get("tools", [])
    main_agent_config = config_data.get("main_agent", {})
    environment_vars = config_data.get("environment", {})
    
    logger.info(f"Configuration loaded: {len(agents_config)} agents, {len(tools_config)} tools")
    
    # Create generated directories
    Path("generated/agents").mkdir(parents=True, exist_ok=True)
    Path("generated/tools").mkdir(parents=True, exist_ok=True)
    
    # Initialize components
    transformer = ToolSpecTransformer()
    generator = PythonModuleGenerator()
    package_generator = DeploymentPackageGenerator()
    
    # Generate default tools (always available to all agents)
    logger.info("Generating default tools (ask_user, speak_to_user)...")
    default_tools = generator.generate_default_tools("generated/tools")
    
    # Generate frontend tools
    logger.info(f"Generating {len(tools_config)} frontend tools...")
    generated_tools = []
    for tool_spec in tools_config:
        tool_name = tool_spec.get("name")
        logger.debug(f"Processing tool: {tool_name}")
        
        # Transform and generate tool
        tool_specification = transformer.transform_frontend_data(tool_spec)
        module_path = generator.generate_tool_module(tool_specification, "generated/tools")
        generated_tools.append(tool_name)
        logger.info(f"✅ Generated tool: {tool_name}")
    
    # Combine default tools with user-defined tools
    all_frontend_tools = default_tools + generated_tools
    
    # Generate agent tools
    logger.info(f"Generating {len(agents_config)} agent tools...")
    generated_agents = []
    for agent_spec in agents_config:
        agent_name = agent_spec.get("name")
        logger.debug(f"Processing agent: {agent_name}")
        
        # Add default tools to agent's tool list if not already present
        agent_tools = agent_spec.get("tools", [])
        for default_tool in default_tools:
            if default_tool not in agent_tools:
                agent_tools.append(default_tool)
        agent_spec["tools"] = agent_tools
        
        # Transform and generate agent
        agent_specification = transformer.transform_frontend_data(agent_spec)
        module_path = generator.generate_tool_module(agent_specification, "generated/agents")
        generated_agents.append(agent_name)
        logger.info(f"✅ Generated agent: {agent_name} (with default tools)")
    
    # Create deployment package
    logger.info("Creating deployment package...")
    deployment_path = package_generator.create_deployment_package(
        main_agent_config=main_agent_config,
        agent_tools=generated_agents,
        frontend_tools=all_frontend_tools,
        environment_vars=environment_vars
    )
    
    logger.info(f"✅ Deployment package created: {deployment_path}")
    return str(deployment_path)


def main():
    """Main entry point"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python process_config.py <config_file.json>")
        print("\nExample:")
        print("  python process_config.py sample_config.json")
        sys.exit(1)
    
    config_file = sys.argv[1]
    
    if not Path(config_file).exists():
        print(f"❌ Error: Configuration file not found: {config_file}")
        sys.exit(1)
    
    try:
        print("🚀 Processing configuration...")
        print("=" * 60)
        
        deployment_path = process_configuration(config_file)
        
        print("\n" + "=" * 60)
        print("✅ SUCCESS!")
        print("=" * 60)
        print(f"📁 Deployment package: {deployment_path}")
        print(f"\n📖 Next steps:")
        print(f"   1. cd {deployment_path}")
        print(f"   2. Review README.md for deployment instructions")
        print(f"   3. Configure .env file")
        print(f"   4. Deploy with: agentcore launch")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        logger.exception("Failed to process configuration")
        sys.exit(1)


if __name__ == "__main__":
    main()
