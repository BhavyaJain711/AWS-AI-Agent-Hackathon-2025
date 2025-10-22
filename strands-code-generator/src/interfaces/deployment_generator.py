"""
Interface for deployment generation
"""
from abc import ABC, abstractmethod
from typing import List, Any, Dict
from pathlib import Path

from ..models.deployment_models import DeploymentPackage, DeploymentConfig


class IDeploymentGenerator(ABC):
    """Interface for generating deployment artifacts"""
    
    @abstractmethod
    def generate_deployment_package(self, agents: List[Any], tools_dir: str, config: DeploymentConfig) -> DeploymentPackage:
        """Generate a deployment package for AWS Agent Core Runtime"""
        pass
    
    @abstractmethod
    def create_deployment_config(self, agents: List[Any]) -> DeploymentConfig:
        """Create deployment configuration from agents"""
        pass
    
    @abstractmethod
    def package_for_cli_deployment(self, package: DeploymentPackage) -> Path:
        """Package artifacts for CLI deployment"""
        pass