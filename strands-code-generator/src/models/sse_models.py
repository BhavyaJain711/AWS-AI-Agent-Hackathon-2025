"""
SSE communication data models
"""
from dataclasses import dataclass
from typing import Dict, Any, Optional
from datetime import datetime
import uuid


@dataclass
class SSESession:
    """SSE session information"""
    session_id: str
    client_id: str
    created_at: datetime
    is_active: bool = True
    
    @classmethod
    def create_new(cls, client_id: str) -> 'SSESession':
        """Create a new SSE session"""
        return cls(
            session_id=str(uuid.uuid4()),
            client_id=client_id,
            created_at=datetime.utcnow(),
            is_active=True
        )


@dataclass
class SSEMessage:
    """SSE message structure"""
    type: str
    session_id: str
    timestamp: str
    data: Dict[str, Any]
    
    @classmethod
    def frontend_action(cls, session_id: str, payload: Dict[str, Any]) -> 'SSEMessage':
        """Create a frontend action message"""
        return cls(
            type="frontend_action",
            session_id=session_id,
            timestamp=datetime.utcnow().isoformat(),
            data=payload
        )
    
    def to_sse_format(self) -> str:
        """Convert to SSE format string"""
        import json
        message_data = {
            "type": self.type,
            "sessionId": self.session_id,
            "timestamp": self.timestamp,
            "data": self.data
        }
        return f"data: {json.dumps(message_data)}\n\n"


@dataclass
class CallbackResponse:
    """HTTP callback response structure"""
    session_id: str
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> 'CallbackResponse':
        """Create CallbackResponse from JSON data"""
        return cls(
            session_id=data['sessionId'],
            success=data['success'],
            data=data.get('data'),
            error=data.get('error')
        )