# Event AI Agent

An AI Agent with **Model Context Protocol (MCP)** and **Retrieval Augmented Generation (RAG)** for the Event Management System.

## Overview

This project provides an intelligent AI agent that can:
- **Search documentation** using semantic RAG (nomic-embed-text)
- **Execute actions** via MCP tools (list events, register users, etc.)
- **Enforce policies** based on Event Registration Policy document
- **Connect** to event-backend Express API via HTTP

## Architecture

```
User Input → Main Agent → LLM (llama3.2)
                            ↓
              ┌─────────────┴─────────────┐
              ↓                           ↓
         RAG Search               MCP Tool Execution
         (semantic docs)            (HTTP to API)
              ↓                           ↓
         rag-engine.ts             mcp-server.ts
```

## Prerequisites

1. **Ollama** (running on port 11434)
   - `llama3.2:latest`
   - `nomic-embed-text:latest`

2. **event-backend** (running on port 4000)
   - Get JWT token from login endpoint

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd mcp-rag-project

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

## Configuration

Create `.env` file:

```env
OLLAMA_HOST=http://127.0.0.1:11434
LLM_MODEL=llama3.2:latest
EMBEDDING_MODEL=nomic-embed-text:latest
EXPRESS_API_URL=http://localhost:4000
SERVICE_ACCOUNT_TOKEN=your_jwt_token_from_event_backend
MCP_PORT=3001
```

## Usage

### Start event-backend (separate terminal)

```bash
cd event-backend
npm run start
```

### Start the AI Agent

```bash
npm run agent
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run agent` | Start interactive agent |
| `npm run mcp` | Start MCP server (stdio mode) |
| `npm run discover` | Regenerate API documentation |

## Example Queries

Once the agent is running, try:

```
> show all users
> list all events
> how do I create an event?
> can a user register for the same event twice?
> what permissions do users have?
```

## Features

### RAG (Retrieval Augmented Generation)
- Semantic search over API documentation
- Policy-aware responses
- Embeds documents using nomic-embed-text

### MCP (Model Context Protocol)
- 15+ tools wrapping Express API endpoints
- Standardized tool interface
- Stdio-based transport

### Policy Enforcement
- Registration eligibility checks
- Date and capacity constraints
- User vs Admin permissions
- Duplicate registration prevention

## Project Structure

```
src/
├── config.ts              # Configuration
├── rag-engine.ts         # RAG implementation
├── main-agent.ts         # Main orchestration
├── mcp-server.ts         # MCP server
├── discovery-script.ts  # Documentation generator
├── index.ts             # Entry point
└── rag/
    └── docs/
        └── api-map.md   # RAG knowledge base
```

## Documentation

See `docs/TECHNICAL_DOCUMENTATION.md` for detailed technical documentation.

## License

MIT