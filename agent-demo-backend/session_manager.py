import uuid
import time
from typing import Dict, Optional

class SessionManager:
    """Manages WebSocket sessions and their associated agent runtime sessions"""
    
    def __init__(self):
        self.sessions: Dict[str, dict] = {}
        # Format: {
        #     'socket_id': {
        #         'runtime_session_id': 'unique_33_char_id',
        #         'created_at': timestamp,
        #         'last_activity': timestamp
        #     }
        # }
    
    def create_session(self, socket_id: str) -> str:
        """Create a new runtime session for a socket connection"""
        # Generate a unique session ID (must be 33+ characters)
        runtime_session_id = f"session_{uuid.uuid4().hex}_{int(time.time())}"
        
        self.sessions[socket_id] = {
            'runtime_session_id': runtime_session_id,
            'created_at': time.time(),
            'last_activity': time.time()
        }
        
        print(f"[SessionManager] Created session for {socket_id}: {runtime_session_id}")
        return runtime_session_id
    
    def get_session(self, socket_id: str) -> Optional[str]:
        """Get the runtime session ID for a socket connection"""
        session = self.sessions.get(socket_id)
        if session:
            # Update last activity
            session['last_activity'] = time.time()
            return session['runtime_session_id']
        return None
    
    def get_or_create_session(self, socket_id: str) -> str:
        """Get existing session or create new one"""
        session_id = self.get_session(socket_id)
        if session_id:
            return session_id
        return self.create_session(socket_id)
    
    def remove_session(self, socket_id: str) -> Optional[str]:
        """Remove a session when socket disconnects and return the runtime session ID"""
        if socket_id in self.sessions:
            runtime_session_id = self.sessions[socket_id]['runtime_session_id']
            del self.sessions[socket_id]
            print(f"[SessionManager] Removed session for {socket_id}: {runtime_session_id}")
            return runtime_session_id
        return None
    
    def cleanup_stale_sessions(self, max_age_seconds: int = 3600):
        """Remove sessions that haven't been active for a while"""
        current_time = time.time()
        stale_sessions = [
            socket_id for socket_id, session in self.sessions.items()
            if current_time - session['last_activity'] > max_age_seconds
        ]
        
        for socket_id in stale_sessions:
            self.remove_session(socket_id)
        
        if stale_sessions:
            print(f"[SessionManager] Cleaned up {len(stale_sessions)} stale sessions")
    
    def get_session_info(self, socket_id: str) -> Optional[dict]:
        """Get full session information"""
        return self.sessions.get(socket_id)
    
    def list_active_sessions(self) -> list:
        """List all active sessions"""
        return list(self.sessions.keys())

# Global session manager instance
session_manager = SessionManager()
