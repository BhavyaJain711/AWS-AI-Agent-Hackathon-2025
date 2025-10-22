"""
Deployment configuration data models
"""
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from pathlib import Path


@dataclass
class DeploymentConfig:
    """Configuration for AWS Agent Core Runtime deployment"""
    agent_name: str
    runtime_version: str
    tools_directory: str
    dependencies: List[str]
    environment_variables: Dict[str, str]
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class DeploymentPackage:
    """Deployment package information"""
    package_path: Path
    config: DeploymentConfig
    agents: List[str]  # List of agent names
    tools: List[str]   # List of tool names
    created_at: str
    
    def to_manifest(self) -> Dict[str, Any]:
        """Generate deployment manifest"""
        return {
            "package_info": {
                "created_at": self.created_at,
                "runtime_version": self.config.runtime_version
            },
            "agents": self.agents,
            "tools": self.tools,
            "dependencies": self.config.dependencies,
            "environment": self.config.environment_variables,
            "metadata": self.config.metadata
        }