"""
Application settings and configuration
"""
from pydantic_settings import BaseSettings
from typing import Dict, Any, Optional


class Settings(BaseSettings):
    """Application configuration settings"""
    
    # Application settings
    app_name: str = "Dynamic Strands System"
    version: str = "0.1.0"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # AWS settings
    aws_region: str = "us-east-1"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    
    # Tool generation settings
    tools_output_dir: str = "generated_tools"
    max_tools_per_agent: int = 50
    
    # SSE settings
    sse_timeout: int = 30
    max_sse_connections: int = 1000
    
    # Deployment settings
    deployment_output_dir: str = "deployments"
    aws_agent_core_runtime_version: str = "latest"
    
    # Logging settings
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    backend_url: str = "https://your-backend-url"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()