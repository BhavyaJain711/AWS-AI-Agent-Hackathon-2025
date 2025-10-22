#!/bin/bash

# FastAPI Server Docker Build Script
# Supports multi-platform builds (AMD64 and ARM64)

set -e

IMAGE_NAME="fastapi-todo-server"
VERSION="latest"

echo "🐳 Building Docker image: $IMAGE_NAME:$VERSION"

# Check if buildx is available for multi-platform builds
if docker buildx version &> /dev/null; then
    echo "✅ Docker Buildx detected - building for multiple platforms"
    
    # Create builder if it doesn't exist
    docker buildx create --name multiplatform --use 2>/dev/null || docker buildx use multiplatform
    
    # Build for both AMD64 and ARM64
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -t $IMAGE_NAME:$VERSION \
        --load \
        .
    
    echo "✅ Multi-platform build complete!"
else
    echo "⚠️  Docker Buildx not available - building for current platform only"
    
    # Standard build for current platform
    docker build -t $IMAGE_NAME:$VERSION .
    
    echo "✅ Build complete!"
fi

echo ""
echo "📦 Image built: $IMAGE_NAME:$VERSION"
echo ""
echo "To run the container:"
echo "  docker run -d -p 8000:8000 --name fastapi-server $IMAGE_NAME:$VERSION"
echo ""
echo "To run with persistent database:"
echo "  docker run -d -p 8000:8000 -v \$(pwd)/data:/app/data --name fastapi-server $IMAGE_NAME:$VERSION"
