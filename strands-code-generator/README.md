# Dynamic Strands System

A dynamic abstraction layer over AWS Strands SDK that enables creation and deployment of multi-agent systems from JSON configuration data.

## Features

- **Dynamic Tool Generation**: Create Python tool modules at runtime from frontend data
- **Multi-Agent Orchestration**: Support for agents-as-tools pattern
- **Real-time Frontend Integration**: SSE-based communication for frontend actions
- **AWS Integration**: Deploy to AWS Agent Core Runtime
- **Flexible Configuration**: JSON-based agent and tool configuration

## Project Structure

```
src/
├── __init__.py
├── config/                 # Configuration management
├── models/                 # Data models and schemas
├── interfaces/             # Abstract base classes
├── dynamic_tool_generator/ # Tool generation engine
├── agent_factory/          # Agent creation and management
├── sse_communication/      # SSE communication hub
├── deployment/             # Deployment generation
└── exceptions.py           # Custom exceptions
```

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Install in development mode
pip install -e .
```

## Configuration

Copy `.env.example` to `.env` and configure your settings:

```bash
cp .env.example .env
```

## Development

This project follows the specification-driven development approach. See the `.kiro/specs/dynamic-strands-system/` directory for detailed requirements, design, and implementation tasks.

## Requirements

- Python 3.8+
- AWS Account (for deployment)
- AWS Strands SDK (when available)

## License

TBD