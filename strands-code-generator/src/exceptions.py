"""
Custom exceptions for Dynamic Strands System
"""


class DynamicStrandsError(Exception):
    """Base exception for Dynamic Strands System"""
    pass


class ToolGenerationError(DynamicStrandsError):
    """Error during tool generation"""
    pass


class AgentCreationError(DynamicStrandsError):
    """Error during agent creation"""
    pass


class SSECommunicationError(DynamicStrandsError):
    """Error in SSE communication"""
    pass


class DeploymentError(DynamicStrandsError):
    """Error during deployment"""
    pass


class ConfigurationError(DynamicStrandsError):
    """Error in configuration"""
    pass


class ValidationError(DynamicStrandsError):
    """Error in data validation"""
    pass