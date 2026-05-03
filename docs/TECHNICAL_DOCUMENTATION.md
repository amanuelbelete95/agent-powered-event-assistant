# AI Agent with MCP and RAG - Technical Documentation

## Overview

This project implements an AI Agent that combines **Model Context Protocol (MCP)** with **Retrieval Augmented Generation (RAG)** to interact with an Event Management System (event-backend).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER                                          │
│                    (Terminal / CLI Input)                                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      MAIN AGENT (main-agent.ts)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    LLM (llama3.2)                                │   │
│  │  • Analyzes user input                                           │   │
│  │  • Decides: Use RAG or MCP Tool?                                 │   │
│  │  • Returns tool decision as JSON                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │   RAG ENGINE  │   │   MCP SERVER  │   │  EXPRESS API  │
    │               │   │               │   │               │
    │ search()      │   │ list_events   │   │ event-backend │
    │ embedChunks() │   │ list_users    │   │    :4000       │
    │ loadApiMap()  │   │ create_event │   │               │
    └───────────────┘   │ register_to   │   └───────────────┘
                        │   _event      │
                        └───────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  CONFIG (config.ts)     │
                    │  • OLLAMA_HOST           │
                    │  • EXPRESS_API_URL       │
                    │  • SERVICE_TOKEN         │
                    └─────────────────────────┘
```

---

## Components

### 1. Configuration (config.ts)

Central configuration that connects all components:

```typescript
export const config = {
  // Ollama (local LLM)
  ollamaHost: 'http://127.0.0.1:11434',
  embeddingModel: 'nomic-embed-text:latest',
  llmModel: 'llama3.2:latest',
  
  // Event Backend API
  expressApiUrl: 'http://localhost:4000',
  serviceToken: 'jwt_token_here',
  
  // RAG Settings
  rag: {
    chunkSize: 500,
    topK: 3,
  }
};
```

### 2. RAG Engine (rag-engine.ts)

**Purpose**: Semantic search over API documentation and policies

**Functions**:
- `loadApiMap()` - Loads markdown files from `rag/docs/`
- `embedChunks()` - Converts text to vectors using nomic-embed-text
- `search(query)` - Finds relevant documents using cosine similarity

**Workflow**:
```
User Query → Embed Query → Compare Vectors → Return Top-K Results
```

**Code Flow**:
```typescript
// 1. Load documents
loadApiMap(); // Reads api-map.md into chunks

// 2. Embed each chunk (call Ollama API)
await embedChunks(); // Converts text to 768-dim vectors

// 3. Search (semantic similarity)
const results = await search('how to register');
// Returns: [{ chunk, score }, { chunk, score }, ...]
```

### 3. Main Agent (main-agent.ts)

**Purpose**: Orchestrates user input → LLM decision → Tool execution

**System Prompt** (tells LLM what to do):
```
You are an intelligent agent for an Event Management System.

## CRITICAL POLICY RULES
- MUST query RAG FIRST for policy questions
- BEFORE calling register_to_event, check policy
- IF user tries to delete, explain "no permission"

## TOOL SELECTION
- "how do I..." → search_api_docs
- "list events" → list_events  
- "register for" → register_to_event
```

**LLM Response Format**:
```json
{"tool": "tool_name", "arguments": {"param": "value"}}
```

**Full Workflow**:
```
1. User Input: "can a user register twice?"
2. Build Prompt (with policy rules)
3. Call Ollama /api/chat
4. Parse JSON response
5. Execute Tool:
   - If tool = "search_api_docs" → Call RAG search
   - If tool = "list_events" → Call Express API
6. Return result to user
```

### 4. MCP Server (mcp-server.ts)

**Purpose**: Model Context Protocol server for tool-based interactions

**Tools Available**:
| Tool | Description |
|------|-------------|
| list_events | GET /api/events |
| list_users | GET /api/users |
| create_event | POST /api/events |
| register_to_event | POST /api/event-register |
| get_event | GET /api/events/:id |
| ... | ... |

**Protocol**: Uses stdio transport (read from stdin, write to stdout)

### 5. Discovery Script (discovery-script.ts)

**Purpose**: Generate API documentation from various sources

**Workflow**:
```
1. Parse index.js (optional - for API endpoints)
2. Load additional markdown files from rag/docs/
3. Combine into api-map.md
4. Output to rag/docs/api-map.md
```

---

## Data Flow Examples

### Example 1: Policy Question

**User Input**: "can a user register for the same event twice?"

**Flow**:
```
1. main-agent receives input
2. LLM decides → {tool: "search_api_docs", arguments: {query: "can user register twice"}}
3. executeTool() calls search() in rag-engine.ts
4. rag-engine embeds query → searches vectors → returns policy text
5. Result: "One Registration Per User Per Event - A user is strictly prohibited..."
```

### Example 2: List Events

**User Input**: "show me all events"

**Flow**:
```
1. main-agent receives input
2. LLM decides → {tool: "list_events", arguments: {}}
3. executeTool() calls callApi('/api/events')
4. HTTP GET to event-backend:4000/api/events
5. Returns JSON array of events
```

### Example 3: Register for Event

**User Input**: "register me for event 123"

**Flow**:
```
1. main-agent receives input
2. LLM decides → {tool: "register_to_event", arguments: {event_id: 123, user_id: 2, reason: "Interested"}}
3. executeTool() calls callApi('/api/event-register', 'POST', args)
4. HTTP POST to event-backend:4000/api/event-register
5. Backend validates:
   - Checks event date (if passed → error)
   - Checks capacity (if full → error)
   - Checks duplicate (if exists → error)
6. Returns success or error
```

---

## RAG Knowledge Base

The RAG system loads from `src/rag/docs/api-map.md` which contains:

### 1. API Endpoints (from event-backend)
```
| POST | /api/events | Create event |
| GET  | /api/events | List events  |
| POST | /api/event-register | Register |
```

### 2. Event Registration Policy

**Registration Eligibility**:
- Date must be in future
- Capacity must not be full

**Constraints**:
- Event date passed → Registration disabled
- At max capacity → No more registrations

**Permissions**:
- Users: Can view, register (not delete/modify)
- Admins: Full CRUD + manual registration

---

## Configuration Files

### .env
```
OLLAMA_HOST=http://127.0.0.1:11434
LLM_MODEL=llama3.2:latest
EMBEDDING_MODEL=nomic-embed-text:latest
EXPRESS_API_URL=http://localhost:4000
SERVICE_ACCOUNT_TOKEN=eyJhbGci... (JWT from event-backend)
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "types": ["node"],
    "esModuleInterop": true
  }
}
```

### package.json Scripts
```json
{
  "scripts": {
    "agent": "tsx src/main-agent.ts",
    "mcp": "tsx src/mcp-server.ts",
    "discover": "tsx src/discovery-script.ts"
  }
}
```

---

## Running the System

### Prerequisites
1. **Ollama** running with models:
   - `llama3.2:latest`
   - `nomic-embed-text:latest`

2. **event-backend** running on port 4000

3. **JWT token** from event-backend (for API calls)

### Start Commands

```bash
# Terminal 1: Start event-backend
cd event-backend
npm run start

# Terminal 2: Start AI Agent
cd mcp-rag-project
npm run agent

# Terminal 3 (optional): Start MCP Server
npm run mcp
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `fetch failed` | Ollama not reachable | Check OLLAMA_HOST in .env |
| `401 Unauthorized` | JWT token expired | Generate new token |
| `RAG not initialized` | embedChunks() not called | Ensure loadApiMap() runs first |

### Debugging

```typescript
// Test RAG
import { loadApiMap, embedChunks, search } from './rag-engine.js';
loadApiMap();
await embedChunks();
const results = await search('test query');

// Test API
const response = await fetch('http://localhost:4000/api/users', {
  headers: { 'Authorization': 'Bearer TOKEN' }
});
```

---

## File Structure

```
mcp-rag-project/
├── src/
│   ├── config.ts              # Configuration
│   ├── rag-engine.ts          # RAG implementation
│   ├── main-agent.ts          # Main orchestration
│   ├── mcp-server.ts         # MCP server
│   ├── discovery-script.ts   # Doc generator
│   ├── index.ts              # Entry point
│   └── rag/
│       └── docs/
│           └── api-map.md    # RAG knowledge base
├── .env                       # Environment variables
├── .env.example              # Example env
├── package.json
└── tsconfig.json
```

---

## Key Design Decisions

1. **In-Memory RAG**: No external vector DB, simple array storage
2. **HTTP to Express**: Agent calls event-backend via HTTP, not direct DB
3. **LLM-Driven**: LLM decides which tool to use (not hardcoded rules)
4. **Policy-Aware**: System prompt enforces policy checks before actions
5. **JSON Tool Format**: LLM returns structured JSON, parsed and executed

---

## Dependencies

| Package | Purpose |
|---------|---------|
| @modelcontextprotocol/sdk | MCP protocol |
| dotenv | Environment variables |
| tsx | Run TypeScript directly |
| @types/node | TypeScript types |

---

*Document Version: 1.0*  
*Generated: May 2026*