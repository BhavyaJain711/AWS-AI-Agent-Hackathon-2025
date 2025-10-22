"""
Pytest configuration and fixtures
"""
import pytest
from pathlib import Path
import tempfile
import shutil


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests"""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    shutil.rmtree(temp_path)


@pytest.fixture
def sample_tool_spec():
    """Sample tool specification for testing"""
    from src.models.tool_spec import ToolSpecification, ToolType, ToolInputSchema
    
    input_schema = ToolInputSchema(
        type="object",
        properties={
            "message": {"type": "string", "description": "Message to display"}
        },
        required=["message"]
    )
    
    return ToolSpecification(
        name="test_tool",
        description="A test tool",
        tool_type=ToolType.FRONTEND_ACTION,
        input_schema=input_schema
    )


@pytest.fixture
def sample_agent_config():
    """Sample agent configuration for testing"""
    from src.models.agent_config import AgentConfig, BehaviorConfig
    
    behavior_config = BehaviorConfig(temperature=0.7)
    
    return AgentConfig(
        name="test_agent",
        system_prompt="You are a test agent",
        tools=["test_tool"],
        behavior_config=behavior_config
    )