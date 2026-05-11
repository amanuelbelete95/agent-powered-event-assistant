# Agent-Powered Event Assistant

An **AI-Powered Event Management System** built with Model Context Protocol (MCP) and Large Language Models (LLM) for intelligent event registration and administration.

## Overview

This project implements an intelligent AI agent that uses MCP (Model Context Protocol) to connect a local LLM (Ollama) to an Event Management API. The agent can understand natural language queries, select the appropriate tool, execute actions via MCP, and provide human-readable responses.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                              │
│                         (CLI Chat Interface)                          │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       ORCHESTRATOR LAYER                              │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    mcp-orchestrator.ts                         │   │
│  │  1. Receives user query                                        │   │
│  │  2. Uses LLM to select appropriate MCP tool                    │   │
│  │  3. Executes tool via MCP Client                               │   │
│  │  4. Formats response using LLM                                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────────┐
│      MCP CLIENT LAYER         │   │       RAG LAYER                   │
│  mcp-client.ts                │   │  (Retrieval-Augmented             │
│                               │   │   Generation)                      │
│  • Spawns MCP server process │   │                                    │
│  • Handles JSON-RPC over stdio│   │  • Semantic search over           │
│  • Tool discovery & execution │   │    API documentation               │
│  • Response handling          │   │  • Policy-aware responses          │
└───────────────────────────────┘   └───────────────────────────────────┘
                │
                ▼
┌───────────────────────────────┐
│       MCP SERVER LAYER        │
│  mcp-server.ts               │
│                               │
│  15+ Tools:                   │
│  • User Management (7)       │
│  • Event Management (5)       │
│  • Registration (3)          │
└───────────────────────────────┘
                │
                ▼
┌───────────────────────────────┐
│       EXPRESS API LAYER       │
│    (External Event Backend)   │
│                               │
│  POST /api/events            │
│  GET  /api/users             │
│  POST /api/event-register    │
└───────────────────────────────┘
```

## Technologies

| Component | Technology |
|-----------|------------|
| LLM Engine | Ollama (llama3.2) |
| Protocol | Model Context Protocol (MCP) |
| Embeddings | nomic-embed-text |
| API Client | Express REST API |
| Language | TypeScript |
| Runtime | Node.js |

## Features

### MCP (Model Context Protocol) Implementation
- **15+ MCP Tools** wrapping Express API endpoints
- **JSON-RPC over stdio** for secure communication
- **Tool discovery** via standardized schema
- **Error handling** with meaningful error messages

### Available MCP Tools

**User Management:**
- `register_user` - Create new user accounts
- `login_user` - Authenticate and get JWT token
- `list_users` - Get all users
- `get_user` - Get user by ID
- `update_user` - Update user details
- `delete_user` - Remove user

**Event Management:**
- `create_event` - Create new events
- `list_events` - List all events with status
- `get_event` - Get event details by ID
- `update_event` - Modify event properties
- `delete_event` - Remove event

**Registration:**
- `register_to_event` - Register user for event
- `list_my_registrations` - Get user's registrations
- `check_registration` - Verify registration status

### RAG (Retrieval-Augmented Generation)
- Semantic search over API documentation
- Embedding-based document retrieval using nomic-embed-text
- Context-aware responses combining LLM knowledge + documentation

### LLM-Powered Decision Making
- Automatic tool selection based on user queries
- Natural language response generation
- Policy enforcement logic

## Prerequisites

1. **Ollama** (port 11434)
   ```bash
   ollama run llama3.2
   ollama pull nomic-embed-text
   ```

2. **Express API Backend** (port 4000)
   - Event Management REST API

## Installation

```bash
# Clone repository
git clone <repo-url>
cd agent-powered-event-assistant

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

## Usage

### Start the MCP CLI (Recommended)

```bash
npm run mcp-cli
```

Example session:
```
> list all events
> show all users
> create a new event called Party at Hall on 2024-04-01
> how can I register for an event?
> exit
```

### Start the Main Agent

```bash
npm run agent
```

## Project Structure

```
src/
├── config.ts              # Environment configuration
├── mcp-server.ts         # MCP server with 15+ tools
├── mcp-client.ts         # MCP client (functional pattern)
├── mcp-orchestrator.ts   # LLM-powered orchestration (functional)
├── mcp-cli.ts           # Interactive CLI interface
├── lib/
│   └── api-client.ts    # HTTP client for Express API
└── main-agent.ts        # Main agent implementation
```

## API Integration

The MCP server wraps an Express REST API:

```typescript
// Example: Creating an event via MCP
POST /api/events
{
  "name": "Tech Conference",
  "location": "Convention Center",
  "event_date": "2024-06-15",
  "event_status": "published",
  "capacity": 500,
  "description": "Annual tech conference"
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/mcp-server.ts` | MCP server exposing 15+ tools |
| `src/mcp-client.ts` | Functional MCP client for spawning server |
| `src/mcp-orchestrator.ts` | LLM-based tool selection and response generation |

## License

MIT