# FastAPI + Socket.IO Server

A simple FastAPI server with Socket.IO websocket support.

## Installation

```bash
pip install -r requirements.txt
```

## Running the Server

```bash
uvicorn main:socket_app --host 0.0.0.0 --port 8000
```

## Testing

1. Start the server
2. Open `client.html` in your browser
3. Send messages to test the websocket connection

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

## Socket.IO Events

- `connect` - Client connection event
- `disconnect` - Client disconnection event
- `message` - Receive message from client
- `response` - Send response to client
