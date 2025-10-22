"""
Built-in actions that are automatically available to all agents.
These actions are handled by the backend before forwarding to frontend.
"""

import boto3
import base64
import uuid
from typing import Dict, Any, Optional
import socketio


async def _generate_speech(message: str, voice: str = 'Joanna') -> Optional[str]:
    """
    Generate speech using AWS Polly and return base64 encoded audio
    
    Args:
        message: Text to convert to speech
        voice: Voice ID to use
    
    Returns:
        Base64 encoded audio string, or None if failed
    """
    try:
        polly = boto3.client('polly', region_name='us-east-1')
        
        response = polly.synthesize_speech(
            Text=message,
            OutputFormat='mp3',
            VoiceId=voice,
            Engine='neural'
        )
        
        audio_data = response['AudioStream'].read()
        return base64.b64encode(audio_data).decode('utf-8')
        
    except Exception as e:
        print(f"[TTS] Error generating speech: {e}")
        return None


# Store for pending speech completions
pending_speech_completions: Dict[str, Any] = {}

# Track active speech per client
active_speech_per_client: Dict[str, str] = {}


async def handle_speak_to_user(
    sio: socketio.AsyncServer,
    client_sid: str,
    parameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Handle speak_to_user action - generate speech with AWS Polly and send to frontend
    Waits for frontend to signal speech is nearly complete before returning
    
    Args:
        sio: Socket.IO server instance
        client_sid: Client session ID
        parameters: Action parameters containing 'message' and optional 'voice'
    
    Returns:
        Dict with success status and result data
    """
    import asyncio
    
    message = parameters.get('message', '')
    voice = parameters.get('voice', 'Joanna')
    wait_for_completion = parameters.get('wait_for_completion', True)
    
    if not message:
        return {"success": False, "error": "Missing 'message' parameter"}
    
    # Check if speech is already active for this client
    if client_sid in active_speech_per_client:
        active_speech_id = active_speech_per_client[client_sid]
        return {
            "success": False,
            "error": f"Speech already in progress (ID: {active_speech_id}). Please wait for it to complete."
        }
    
    # Generate speech
    audio_base64 = await _generate_speech(message, voice)
    
    if not audio_base64:
        return {
            "success": False,
            "error": "Failed to generate speech"
        }
    
    # Generate unique speech ID
    speech_id = str(uuid.uuid4())
    
    # Mark speech as active for this client
    active_speech_per_client[client_sid] = speech_id
    
    # Create future to wait for completion if requested
    future = None
    if wait_for_completion:
        future = asyncio.Future()
        pending_speech_completions[speech_id] = future
    
    try:
        # Send audio to frontend via WebSocket
        await sio.emit('speak_audio', {
            'speech_id': speech_id,
            'audio': audio_base64,
            'message': message,
            'voice': voice
        }, room=client_sid)
        
        print(f"[speak_to_user] Sent audio to client (ID: {speech_id}): {message[:50]}...")
        
        # Wait for completion if requested
        if wait_for_completion and future:
            try:
                await asyncio.wait_for(future, timeout=60.0)
                print(f"[speak_to_user] Speech completed (ID: {speech_id})")
            except asyncio.TimeoutError:
                print(f"[speak_to_user] Timeout waiting for completion (ID: {speech_id})")
        
        return {
            "success": True,
            "end_turn":True,
            "message": "Speech sent to user",
            "text": message,
            "speech_id": speech_id,
        }
    
    finally:
        # Clean up
        if speech_id in pending_speech_completions:
            del pending_speech_completions[speech_id]
        
        # Remove active speech marker
        if client_sid in active_speech_per_client and active_speech_per_client[client_sid] == speech_id:
            del active_speech_per_client[client_sid]


def handle_speech_completion(speech_id: str) -> bool:
    """
    Handle speech completion notification from frontend
    
    Args:
        speech_id: Speech ID from speak_audio event
    
    Returns:
        True if completion was handled, False if no pending speech found
    """
    if speech_id in pending_speech_completions:
        future = pending_speech_completions[speech_id]
        if not future.done():
            future.set_result(True)
            return True
    return False


# Store for pending user responses
pending_user_responses: Dict[str, Any] = {}


async def handle_ask_user(
    sio: socketio.AsyncServer,
    client_sid: str,
    parameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Handle ask_user action - ask user a question via TTS and wait for their response
    
    Args:
        sio: Socket.IO server instance
        client_sid: Client session ID
        parameters: Action parameters containing 'question' and optional 'voice'
    
    Returns:
        Dict with success status and user's response
    """
    import asyncio
    
    question = parameters.get('question', '')
    voice = parameters.get('voice', 'Joanna')
    timeout = parameters.get('timeout', 30)  # Default 30 second timeout
    
    if not question:
        return {"success": False, "error": "Missing 'question' parameter"}
    
    # Check if speech is already active for this client
    if client_sid in active_speech_per_client:
        active_speech_id = active_speech_per_client[client_sid]
        return {
            "success": False,
            "error": f"Speech already in progress (ID: {active_speech_id}). Please wait for it to complete."
        }
    
    # Generate speech for the question
    audio_base64 = await _generate_speech(question, voice)
    
    if not audio_base64:
        return {
            "success": False,
            "error": "Failed to generate speech for question"
        }
    
    # Generate unique request ID
    request_id = str(uuid.uuid4())
    
    # Mark speech as active for this client
    active_speech_per_client[client_sid] = request_id
    
    # Create future to wait for response
    future = asyncio.Future()
    pending_user_responses[request_id] = future
    
    try:
        # Send question to frontend with audio
        await sio.emit('ask_user_question', {
            'request_id': request_id,
            'audio': audio_base64,
            'question': question,
            'voice': voice
        }, room=client_sid)
        
        print(f"[ask_user] Asked question (ID: {request_id}): {question[:50]}...")
        
        # Wait for user response with timeout
        try:
            user_response = await asyncio.wait_for(future, timeout=timeout)
            
            print(f"[ask_user] Received response (ID: {request_id}): {user_response[:50]}...")
            
            return {
                "success": True,
                "question": question,
                "answer": user_response,
                "request_id": request_id
            }
            
        except asyncio.TimeoutError:
            print(f"[ask_user] Timeout waiting for response (ID: {request_id})")
            return {
                "success": False,
                "error": f"User did not respond within {timeout} seconds",
                "question": question
            }
    
    finally:
        # Clean up
        if request_id in pending_user_responses:
            del pending_user_responses[request_id]
        
        # Remove active speech marker
        if client_sid in active_speech_per_client and active_speech_per_client[client_sid] == request_id:
            del active_speech_per_client[client_sid]


def handle_user_response(request_id: str, response: str) -> bool:
    """
    Handle user response to a pending question
    
    Args:
        request_id: Request ID from ask_user_question
        response: User's response text
    
    Returns:
        True if response was handled, False if no pending request found
    """
    if request_id in pending_user_responses:
        future = pending_user_responses[request_id]
        if not future.done():
            future.set_result(response)
            return True
    return False


# Registry of built-in actions
BUILTIN_ACTIONS = {
    'speak_to_user': handle_speak_to_user,
    'ask_user': handle_ask_user,
}


async def handle_builtin_action(
    action: str,
    sio: socketio.AsyncServer,
    client_sid: str,
    parameters: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Check if action is a built-in action and handle it.
    
    Args:
        action: Action name
        sio: Socket.IO server instance
        client_sid: Client session ID
        parameters: Action parameters
    
    Returns:
        Result dict if action was handled, None if not a built-in action
    """
    if action in BUILTIN_ACTIONS:
        handler = BUILTIN_ACTIONS[action]
        result = await handler(sio, client_sid, parameters)
        return {
            "success": result.get('success', False),
            "data": result
        }
    
    return None


def is_builtin_action(action: str) -> bool:
    """Check if an action is a built-in action"""
    return action in BUILTIN_ACTIONS


def get_builtin_actions_list() -> list:
    """Get list of all built-in action names"""
    return list(BUILTIN_ACTIONS.keys())
