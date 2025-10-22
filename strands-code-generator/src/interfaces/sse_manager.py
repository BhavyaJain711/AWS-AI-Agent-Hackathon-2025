"""
Interface for SSE communication management
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from ..models.sse_models import SSESession, CallbackResponse


class ISSEManager(ABC):
    """Interface for managing Server-Sent Events communication"""
    
    @abstractmethod
    def create_session(self, client_id: str) -> SSESession:
        """Create a new SSE session"""
        pass
    
    @abstractmethod
    def send_frontend_action(self, session_id: str, payload: Dict[str, Any]) -> None:
        """Send a frontend action via SSE"""
        pass
    
    @abstractmethod
    def wait_for_response(self, session_id: str, timeout: int = 30) -> Optional[Dict[str, Any]]:
        """Wait for a response from the frontend"""
        pass
    
    @abstractmethod
    def handle_callback(self, session_id: str, response_data: Dict[str, Any]) -> None:
        """Handle HTTP callback response"""
        pass
    
    @abstractmethod
    def cleanup_session(self, session_id: str) -> None:
        """Clean up an SSE session"""
        pass