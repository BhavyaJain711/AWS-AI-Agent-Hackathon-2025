"""
Deployment package generator - creates clean deployment packages for AWS Agent Core Runtime
"""
import os
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class DeploymentPackageGenerator:
    """Generates clean deployment packages for AWS Agent Core Runtime"""
    
    def __init__(self, deployment_base_dir: str = "deployments"):
        """
        Initialize deployment package generator
        
        Args:
            deployment_base_dir: Base directory for all deployment packages
        """
        self.deployment_base_dir = Path(deployment_base_dir)
        self.deployment_base_dir.mkdir(exist_ok=True)
    
    def create_deployment_package(
        self,
        main_agent_config: Dict[str, Any],
        agent_tools: List[str],
        frontend_tools: List[str],
        environment_vars: Optional[Dict[str, str]] = None
    ) -> Path:
        """
        Create a clean deployment package
        
        Args:
            main_agent_config: Configuration for the main agent
            agent_tools: List of agent tool file names (without .py)
            frontend_tools: List of frontend tool file names (without .py)
            environment_vars: Environment variables for the deployment
            
        Returns:
            Path to the created deployment package
        """
        try:
            # Create deployment directory (deployments/ is the package itself)
            deployment_dir = self.deployment_base_dir
            if deployment_dir.exists():
                shutil.rmtree(deployment_dir)
            deployment_dir.mkdir(parents=True)
            
            # Create src directory structure
            src_dir = deployment_dir / "src"
            agents_dir = src_dir / "agents"
            tools_dir = src_dir / "tools"
            
            src_dir.mkdir()
            agents_dir.mkdir()
            tools_dir.mkdir()
            
            logger.info(f"Creating deployment package: {deployment_dir}")
            
            # Create __init__.py files for Python packages
            self._create_init_files(deployment_dir, src_dir, agents_dir, tools_dir)
            
            # Copy agent tools to src/agents/
            self._copy_agent_files(agents_dir, agent_tools)
            
            # Copy frontend tools to src/tools/
            self._copy_tool_files(tools_dir, frontend_tools)
            
            # Generate main orchestrator in root deployment directory
            self._generate_main_orchestrator_file(deployment_dir, main_agent_config, agent_tools)
            
            # Generate requirements.txt in root
            self._generate_requirements_file(deployment_dir)
            
            # Generate environment files in root
            self._generate_environment_files(deployment_dir, environment_vars or {})
            
            # Generate deployment info in root
            self._generate_deployment_info(deployment_dir, main_agent_config)
            
            logger.info(f"Successfully created deployment package: {deployment_dir}")
            return deployment_dir
            
        except Exception as e:
            logger.error(f"Failed to create deployment package: {str(e)}")
            raise
    
    def _create_init_files(self, deployment_dir: Path, src_dir: Path, agents_dir: Path, tools_dir: Path) -> None:
        """Create __init__.py files for Python packages"""
        
        # Create root __init__.py (makes deployments/ a package)
        root_init = deployment_dir / "__init__.py"
        with open(root_init, 'w') as f:
            f.write('"""Agent deployment package"""\n')
        
        # Create src/__init__.py
        src_init = src_dir / "__init__.py"
        with open(src_init, 'w') as f:
            f.write('"""Source package for agent deployment"""\n')
        
        # Create src/agents/__init__.py
        agents_init = agents_dir / "__init__.py"
        with open(agents_init, 'w') as f:
            f.write('"""Agent tools package"""\n')
        
        # Create src/tools/__init__.py
        tools_init = tools_dir / "__init__.py"
        with open(tools_init, 'w') as f:
            f.write('"""Frontend tools package"""\n')
        
        logger.debug("Created __init__.py files for packages")
    
    def _copy_agent_files(self, agents_dir: Path, agent_names: List[str]) -> None:
        """Copy agent files to src/agents/ directory"""
        source_dir = Path("generated/agents")
        
        for agent_name in agent_names:
            source_file = source_dir / f"{agent_name}.py"
            if source_file.exists():
                dest_file = agents_dir / f"{agent_name}.py"
                shutil.copy2(source_file, dest_file)
                logger.debug(f"Copied agent file: {agent_name}.py")
            else:
                logger.warning(f"Agent file not found: {source_file}")
    
    def _copy_tool_files(self, tools_dir: Path, tool_names: List[str]) -> None:
        """Copy tool files to src/tools/ directory"""
        source_dir = Path("generated/tools")
        
        for tool_name in tool_names:
            source_file = source_dir / f"{tool_name}.py"
            if source_file.exists():
                dest_file = tools_dir / f"{tool_name}.py"
                shutil.copy2(source_file, dest_file)
                logger.debug(f"Copied tool file: {tool_name}.py")
            else:
                logger.warning(f"Tool file not found: {source_file}")
    
    def _generate_main_orchestrator_file(
        self,
        deployment_dir: Path,
        config: Dict[str, Any],
        agent_tools: List[str]
    ) -> None:
        """Generate the main orchestrator file in deployment root directory"""
        
        # Generate imports for agent tools
        agent_imports = [f"from src.agents.{tool} import {tool}" for tool in agent_tools]
        
        # Add imports for default tools (ask_user, speak_to_user)
        default_tool_imports = [
            "from src.tools.ask_user import ask_user",
            "from src.tools.speak_to_user import speak_to_user"
        ]
        
        # Combine all imports
        all_imports = agent_imports + default_tool_imports
        
        # Generate tools list (agent tools + default tools)
        all_tools = agent_tools + ["ask_user", "speak_to_user"]
        tools_list = ",\n        ".join(all_tools)
        
        orchestrator_content = f'''# {config.get("name", "main_orchestrator")}.py

from strands import Agent
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands.models import BedrockModel

# Import agent tools (sub-agents) and default tools
{chr(10).join(all_imports)}

# Define the orchestrator system prompt
MAIN_SYSTEM_PROMPT = """{config.get("system_prompt", "You are an intelligent orchestrator that routes queries to specialized agents.")}"""

# Initialize model
model = BedrockModel(
    region_name="{config.get("model", {}).get("region", "us-east-1")}",
    model_id="{config.get("model", {}).get("model_id", "us.amazon.nova-premier-v1:0")}"
)

# Create orchestrator agent with agent tools and default communication tools
orchestrator = Agent(
    model=model,
    system_prompt=MAIN_SYSTEM_PROMPT,
    tools=[
        {tools_list}
    ]
)

app = BedrockAgentCoreApp()

@app.entrypoint
async def agent_invocation(payload):
    """Handler for agent invocation with streaming support"""
    user_message = payload.get(
        "prompt", 
        "No prompt found in input, please provide a prompt"
    )
    
    # Stream agent response
    stream = orchestrator.stream_async(user_message)
    async for event in stream:
        yield event

if __name__ == "__main__":
    app.run()
'''
        
        orchestrator_file = deployment_dir / f"{config.get('name', 'main_orchestrator')}.py"
        with open(orchestrator_file, 'w', encoding='utf-8') as f:
            f.write(orchestrator_content)
        
        logger.debug(f"Generated main orchestrator file: {orchestrator_file}")
    
    def _generate_requirements_file(self, deployment_dir: Path) -> None:
        """Generate requirements.txt for deployment"""
        requirements_content = """strands-agents
bedrock-agentcore
strands-agents-tools
requests
"""
        
        requirements_file = deployment_dir / "requirements.txt"
        with open(requirements_file, 'w') as f:
            f.write(requirements_content)
        
        logger.debug("Generated requirements.txt")
    
    def _generate_environment_files(self, deployment_dir: Path, env_vars: Dict[str, str]) -> None:
        """Generate environment configuration files"""
        
        # Default environment variables
        default_env_vars = {
            "BACKEND_URL": "https://your-backend-url",
            "TIMEOUT_SECONDS": "30",
            "DEBUG": "false"
        }
        
        # Merge with provided env vars
        all_env_vars = {**default_env_vars, **env_vars}
        
        # Generate .env content
        env_content = "# Environment variables for agent deployment\n"
        for key, value in all_env_vars.items():
            env_content += f"{key}={value}\n"
        
        # Generate .env file (actual environment file)
        env_file = deployment_dir / ".env"
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        logger.debug("Generated .env")
        
        # Also generate .env.example for reference
        env_example_file = deployment_dir / ".env.example"
        with open(env_example_file, 'w') as f:
            f.write(env_content)
        
        logger.debug("Generated .env.example")
    
    def _generate_deployment_info(self, deployment_dir: Path, config: Dict[str, Any]) -> None:
        """Generate deployment information and instructions"""
        
        deployment_info = f"""# Agent Deployment Package

## Generated Files
- `{config.get('name', 'main_orchestrator')}.py` - Main orchestrator agent (entry point)
- `src/agents/` - Agent tools (sub-agents)
- `src/tools/` - Frontend action tools
- `requirements.txt` - Python dependencies
- `.env` - Environment variables (configured from your config)
- `.env.example` - Environment variables template

## Deployment Instructions

### 1. Review Environment Configuration
The `.env` file has been generated with your configuration. Review and update if needed:
```bash
# Edit .env with your configuration:
# - Set BACKEND_URL to your middle backend server
# - Adjust TIMEOUT_SECONDS if needed
```

### 2. Deploy to AWS Agent Core Runtime
```bash
# Configure the agent
agentcore configure --entrypoint {config.get('name', 'main_orchestrator')}.py --env-file .env

# Deploy to AWS
agentcore launch

# Test the agent
agentcore invoke '{{"prompt": "Hello, how can you help me?"}}'
```

### 3. Agent Capabilities
This agent includes:
- **Agent Tools**: Specialized sub-agents for specific tasks
- **Frontend Tools**: Tools that interact with your frontend via middle backend
- **Streaming Support**: Real-time response streaming

## Architecture
```
Main Agent (Orchestrator)
├── Agent Tools (Sub-agents)
└── Frontend Tools (Middle Backend Integration)
```

## Environment Variables
- `BACKEND_URL`: URL of your middle backend server
- `TIMEOUT_SECONDS`: HTTP request timeout for frontend actions
- `DEBUG`: Enable debug logging (true/false)
"""
        
        readme_file = deployment_dir / "README.md"
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(deployment_info)
        
        logger.debug("Generated README.md")
    
    def list_deployment_packages(self) -> List[str]:
        """List all available deployment packages"""
        if not self.deployment_base_dir.exists():
            return []
        
        packages = []
        for item in self.deployment_base_dir.iterdir():
            if item.is_dir():
                packages.append(item.name)
        
        return packages
    
    def clean_deployment_package(self, package_name: str) -> bool:
        """Remove a deployment package"""
        deployment_dir = self.deployment_base_dir / package_name
        if deployment_dir.exists():
            shutil.rmtree(deployment_dir)
            logger.info(f"Cleaned deployment package: {package_name}")
            return True
        return False