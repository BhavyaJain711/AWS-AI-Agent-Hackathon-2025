#!/bin/bash

# Quick run script for FastAPI server

set -e

IMAGE_NAME="fastapi-todo-server"
CONTAINER_NAME="fastapi-server"

echo "🚀 Starting FastAPI server container..."

# Stop and remove existing container if it exists
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Create data directory if it doesn't exist
mkdir -p data

# Run container with persistent database
docker run -d \
  -p 8000:8000 \
  -v "$(pwd)/data:/app/data" \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  $IMAGE_NAME:latest

echo "✅ Container started!"
echo ""
echo "📊 Server running at: http://localhost:8000"
echo "📝 View logs: docker logs -f $CONTAINER_NAME"
echo "🛑 Stop server: docker stop $CONTAINER_NAME"
