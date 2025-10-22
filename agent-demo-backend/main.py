from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import socketio
import uuid
import asyncio
import os
import json
import boto3
from dotenv import load_dotenv
from typing import Dict, Any
from routers import tasks
import database
import builtin_actions
import time
from session_manager import session_manager

# Load environment variables
load_dotenv()

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,  # Disable Socket.IO logger to reduce noise
    engineio_logger=False,  # Disable Engine.IO logger
    ping_interval=25,  # Send ping every 25 seconds (default is 25)
    ping_timeout=20,  # Wait 20 seconds for pong (default is 20)
)

# Store pending tool calls waiting for responses
pending_tool_calls: Dict[str, asyncio.Future] = {}

# Store connected client session IDs
connected_clients = set()

# Track if agent is currently processing (per client)
agent_processing_lock: Dict[str, bool] = {}

# Create FastAPI app
app = FastAPI(redirect_slashes=False)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tasks.router)

# Socket.IO event handlers
@sio.event
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")
    connected_clients.add(sid)
    # Note: Session will be created on first message
    await sio.emit('response', {'data': 'Connected successfully!'}, room=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    connected_clients.discard(sid)
    
    # Clean up processing lock
    if sid in agent_processing_lock:
        del agent_processing_lock[sid]
    
    # Get session ID before removing
    runtime_session_id = session_manager.get_session(sid)
    
    # Stop runtime session in AWS Bedrock
    if runtime_session_id:
        try:
            aws_region = os.getenv('AWS_REGION', 'ap-south-1')
            agent_runtime_arn = os.getenv('AGENT_RUNTIME_ARN')
            agent_qualifier = os.getenv('AGENT_QUALIFIER', 'DEFAULT')
            
            if agent_runtime_arn:
                print(f"[disconnect] Creating bedrock client to stop session...")
                bedrock_client = boto3.client('bedrock-agentcore', region_name=aws_region)
                
                print(f"[disconnect] Stopping runtime session: {runtime_session_id}")
                
                # Run in executor to avoid blocking
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: bedrock_client.stop_runtime_session(
                        agentRuntimeArn=agent_runtime_arn,
                        runtimeSessionId=runtime_session_id,
                        qualifier=agent_qualifier
                    )
                )
                
                print(f"[disconnect] ✅ Session terminated successfully")
                print(f"[disconnect] Request ID: {response['ResponseMetadata']['RequestId']}")
        except Exception as e:
            # Handle all exceptions gracefully
            error_type = type(e).__name__
            print(f"[disconnect] Error stopping session ({error_type}): {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Remove session from manager
    session_manager.remove_session(sid)

@sio.event
async def message(sid, data):
    print(f"Message from {sid}: {data}")
    await sio.emit('response', {'data': f'Echo: {data}'}, room=sid)

@sio.event
async def speech_completed(sid, data):
    """Handle speech completion notification from frontend"""
    speech_id = data.get('speech_id')
    
    if speech_id:
        handled = builtin_actions.handle_speech_completion(speech_id)
        if handled:
            print(f"[speech_completed] Speech {speech_id} marked as complete")
        else:
            print(f"[speech_completed] No pending speech found for ID: {speech_id}")


@sio.event
async def user_response(sid, data):
    """Handle user response to ask_user question"""
    request_id = data.get('request_id')
    response = data.get('response', '')
    
    print(f"[user_response] from {sid} for request {request_id}: {response[:50]}...")
    
    if request_id and response:
        handled = builtin_actions.handle_user_response(request_id, response)
        if handled:
            print(f"[user_response] Response delivered to pending request")
        else:
            print(f"[user_response] No pending request found for ID: {request_id}")


@sio.event
async def user_prompt(sid, data):
    """Handle user speech/text prompt from client"""
    print(f"[user_prompt] from {sid}: {data}")
    prompt = data.get('prompt', '')
    
    if not prompt:
        print("[user_prompt] Empty prompt received")
        return
    
    # Check if agent is already processing for this client
    if agent_processing_lock.get(sid, False):
        print(f"[user_prompt] Agent is busy, rejecting prompt from {sid}")
        await sio.emit('agent_busy', {
            'message': 'Agent is currently processing. Please wait...'
        }, room=sid)
        return
    
    # Set processing lock
    agent_processing_lock[sid] = True
    print(f"[user_prompt] Lock acquired for {sid}")
    
    try:
        # Get or create session for this socket connection
        runtime_session_id = session_manager.get_or_create_session(sid)
        print(f"[user_prompt] Using runtime session: {runtime_session_id}")
        
        # Initialize AWS Bedrock Agent Runtime client
        aws_region = os.getenv('AWS_REGION', 'ap-south-1')
        agent_runtime_arn = os.getenv('AGENT_RUNTIME_ARN')
        agent_qualifier = os.getenv('AGENT_QUALIFIER', 'DEFAULT')
        
        if not agent_runtime_arn:
            raise ValueError("AGENT_RUNTIME_ARN not configured in .env file")
        
        print(f"[user_prompt] Creating bedrock-agentcore client...")
        bedrock_client = boto3.client('bedrock-agentcore', region_name=aws_region)
        
        print(f"[user_prompt] Invoking AWS Bedrock Agent: {prompt}")
        
        # Prepare payload
        payload = json.dumps({
            "input": {"prompt": prompt}
        })
        
        # Invoke agent runtime (this is synchronous, so run in executor)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: bedrock_client.invoke_agent_runtime(
                agentRuntimeArn=agent_runtime_arn,
                runtimeSessionId=runtime_session_id,
                payload=payload,
                qualifier=agent_qualifier
            )
        )
        
        print(f"[user_prompt] Agent invoked, reading response...")
        
        # Read response body (also synchronous)
        response_body = await loop.run_in_executor(
            None,
            lambda: response['response'].read()
        )
        
        print(f"[user_prompt] Response body read, parsing JSON...")
        response_data = json.loads(response_body)
        
        print(f"[user_prompt] Agent response received")
        print(f"[user_prompt] Response data: {str(response_data)[:500]}")
        
        # Send response back to client
        await sio.emit('agent_response', {
            'success': True,
            'response': response_data
        }, room=sid)
        
        # Agent turn is complete
        print(f"[user_prompt] ✅ Agent turn completed")
        await sio.emit('agent_turn_complete', {
            'timestamp': time.time()
        }, room=sid)
                
    except Exception as e:
        print(f"[user_prompt] Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        await sio.emit('agent_response', {
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }, room=sid)
    
    finally:
        # Release processing lock
        agent_processing_lock[sid] = False
        print(f"[user_prompt] Lock released for {sid}")

@sio.event
async def frontend_tool_response(sid, data):
    """Handle tool execution response from client"""
    print(f"[frontend_tool_response] from {sid}: {data}")
    tool_call_id = data.get('toolCallId')
    success = data.get('success')
    result = data.get('result')
    error = data.get('error')
    
    print(f"Tool call {tool_call_id} completed - Success: {success}")
    if success:
        print(f"Result: {result}")
    else:
        print(f"Error: {error}")
    
    # Resolve the pending future if it exists
    if tool_call_id in pending_tool_calls:
        future = pending_tool_calls[tool_call_id]
        if not future.done():
            future.set_result(data)
        del pending_tool_calls[tool_call_id]

# FastAPI routes
@app.get("/")
async def root():
    return {"message": "FastAPI + Socket.IO Server"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "active_sessions": len(session_manager.list_active_sessions()),
        "connected_clients": len(connected_clients)
    }


@app.get("/api/builtin-actions")
async def list_builtin_actions():
    """List all available built-in actions"""
    return {
        "builtin_actions": builtin_actions.get_builtin_actions_list(),
        "count": len(builtin_actions.get_builtin_actions_list())
    }

@app.post("/api/frontend-action")
async def frontend_action(payload: Dict[str, Any]):
    """
    Handle frontend action requests from AWS Strands agent
    
    Payload format:
    {
        "action": "create_task",
        "parameters": { "title": "My task", ... }
    }
    
    Returns:
    {
        "success": true,
        "data": { ... }
    }
    """
    action = payload.get('action')
    parameters = payload.get('parameters', {})
    
    if not action:
        raise HTTPException(status_code=400, detail="Missing 'action' in payload")
    
    # Check if any client is connected
    if not connected_clients:
        raise HTTPException(status_code=503, detail="No frontend client connected")
    
    # Use the first connected client (in production, you might want to track specific users)
    client_sid = next(iter(connected_clients))
    
    # Check if this is a built-in action
    builtin_result = await builtin_actions.handle_builtin_action(
        action, sio, client_sid, parameters
    )
    if builtin_result is not None:
        return builtin_result
    
    # Generate unique tool call ID
    tool_call_id = str(uuid.uuid4())
    
    # Create a future to wait for the response
    future = asyncio.Future()
    pending_tool_calls[tool_call_id] = future
    
    try:
        # Send the tool call to frontend
        await sio.emit('frontend_tool', {
            'toolCallId': tool_call_id,
            'action': action,
            'id': 'todo-list',  # Component ID
            'args': [parameters] if parameters else []
        }, room=client_sid)
        
        print(f"[frontend_action] Sent {action} with ID {tool_call_id}")
        
        # Wait for response with timeout
        try:
            response = await asyncio.wait_for(future, timeout=30.0)
            
            # Return the response in the format expected by Strands agent
            return {
                "success": response.get('success', False),
                "data": response.get('result', {})
            }
        except asyncio.TimeoutError:
            # Clean up the pending call
            if tool_call_id in pending_tool_calls:
                del pending_tool_calls[tool_call_id]
            raise HTTPException(status_code=504, detail="Frontend action timed out")
    
    except Exception as e:
        # Clean up on error
        if tool_call_id in pending_tool_calls:
            del pending_tool_calls[tool_call_id]
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test-tool-call")
async def test_tool_call(sid: str, action: str, component_id: str):
    """
    Test endpoint to trigger a frontend tool call
    Example: POST /test-tool-call?sid=<session_id>&action=increment&component_id=counter
    """
    tool_call_id = await call_frontend_tool(sid, action, component_id)
    return {
        "status": "sent",
        "toolCallId": tool_call_id,
        "action": action,
        "componentId": component_id
    }

# Helper function to call frontend tools
async def call_frontend_tool(sid: str, action: str, component_id: str, *args):
    """
    Call a frontend tool and return a tool call ID for tracking
    
    Args:
        sid: Socket session ID
        action: Action name to call
        component_id: Component ID that has the action
        *args: Arguments to pass to the action
    
    Returns:
        str: Tool call ID for tracking the response
    """
    tool_call_id = str(uuid.uuid4())
    
    await sio.emit('frontend_tool', {
        'toolCallId': tool_call_id,
        'action': action,
        'id': component_id,
        'args': list(args) if args else []
    }, room=sid)
    
    print(f"[frontend_tool] Called {action} on {component_id} with ID {tool_call_id}")
    return tool_call_id

# Combine FastAPI and Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
