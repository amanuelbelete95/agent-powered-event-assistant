import readline from 'readline';
import config from './config.js';
import { callApi } from './lib/api-client.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

const tools: Tool[] = [
  {
    name: 'list_events',
    description: 'Get all events from the database. Returns event list with name, location, status, date.',
    parameters: {}
  },
  {
    name: 'list_users',
    description: 'Get all users from the database. Returns user list with username, firstname, lastname, role.',
    parameters: {}
  },
  {
    name: 'get_event',
    description: 'Get a specific event by ID. Requires event_id parameter.',
    parameters: { id: { type: 'number', description: 'Event ID', required: true } }
  },
  {
    name: 'get_user',
    description: 'Get a specific user by ID. Requires user_id parameter.',
    parameters: { id: { type: 'number', description: 'User ID', required: true } }
  },
  {
    name: 'create_event',
    description: 'Create a new event. Requires name, location, event_date, event_status, capacity, description.',
    parameters: {
      name: { type: 'string', description: 'Event name', required: true },
      location: { type: 'string', description: 'Event location', required: true },
      event_date: { type: 'string', description: 'Event date (ISO8601)', required: true },
      event_status: { type: 'string', description: 'Event status (published/draft/cancelled)', required: true },
      capacity: { type: 'number', description: 'Maximum capacity', required: true },
      description: { type: 'string', description: 'Event description', required: true }
    }
  },
  {
    name: 'register_to_event',
    description: 'Register a user for an event. Requires event_id, user_id, reason.',
    parameters: {
      event_id: { type: 'number', description: 'Event ID', required: true },
      user_id: { type: 'number', description: 'User ID', required: true },
      reason: { type: 'string', description: 'Reason for registration', required: true }
    }
  }
];

function buildSystemPrompt(): string {
  return `You are an intelligent agent for an Event Management System.

## CRITICAL POLICY RULES

**MUST query search_api_docs FIRST when user asks about:**
- "how to register"
- "registration eligibility"
- "refunds"
- "permissions"
- "registration errors"
- "what can I do"
- "am I allowed to"
- "can a user register twice"
- "what happens if event is full"
- "event date passed"

**BEFORE calling register_to_event tool:**
1. MUST use search_api_docs to check EVENT_REGISTRATION_POLICY
2. Verify: event_date vs current_date (if past, registration is disabled)
3. Verify: registration_count vs capacity (if at max, no more registrations)
4. If blocked: Explain using SPECIFIC policy text (e.g., "Event capacity reached. Registration is closed.")

**IF USER TRIES TO DELETE AN EVENT:**
- Use search_api_docs to find Permissions section
- Explain: "Users have NO permission to delete or modify events"

## TOOL SELECTION RULES

**USE search_api_docs when user asks:**
- "how do I..." or "how can I..."
- "which endpoint..."
- "what endpoint..."
- "what is the..."
- Policy questions about registration, permissions, errors

**USE list_events when user asks:**
- "list events" or "show events"
- "what events exist"

**USE list_users when user asks:**
- "list users" or "show users"

**USE register_to_event when user explicitly registers:**
- Must check policy first!

## AVAILABLE TOOLS

1. search_api_docs(query) - Search API docs AND policies
2. list_events() - Get all events
3. list_users() - Get all users  
4. get_event(id) - Get event by ID
5. get_user(id) - Get user by ID
6. create_event(...) - Create new event (admin only)
7. register_to_event(...) - Register for event (check policy!)

## RESPONSE FORMAT

Respond with ONLY valid JSON:
{"tool": "tool_name", "arguments": {"param": "value"}}

Example: {"tool": "search_api_docs", "arguments": {"query": "how to create event"}}
Example: {"tool": "list_events", "arguments": {}}
Example: {"tool": "search_api_docs", "arguments": {"query": "can user register twice"}}

The query in search_api_docs should be the user's original question or a brief description of what they want to know.`;
}

async function executeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case 'list_events': {
      const events = await callApi('GET', '/api/events');
      const list = events as unknown[];
      if (Array.isArray(list) && list.length > 0) {
        return `📋 Events (${list.length}):\n` + list.map((e: any) => 
          `  • ${e.name} | ${e.location} | ${e.event_status}`).join('\n');
      }
      return 'No events found';
    }
    
    case 'list_users': {
      const users = await callApi('GET', '/api/users');
      const list = users as unknown[];
      if (Array.isArray(list) && list.length > 0) {
        return `👥 Users (${list.length}):\n` + list.map((u: any) => 
          `  • ${u.username} (${u.firstname} ${u.lastname}) - ${u.role}`).join('\n');
      }
      return 'No users found';
    }
    
    case 'get_event': {
      const event = await callApi('GET', `/api/events/${args.id}`);
      return JSON.stringify(event, null, 2);
    }
    
    case 'get_user': {
      const user = await callApi('GET', `/api/users/${args.id}`);
      return JSON.stringify(user, null, 2);
    }
    
    case 'create_event': {
      const result = await callApi('POST', '/api/events', args);
      return `✅ Event created:\n` + JSON.stringify(result, null, 2);
    }
    
    case 'register_to_event': {
      const result = await callApi('POST', '/api/event-register', args);
      return `✅ Registered:\n` + JSON.stringify(result, null, 2);
    }
    
    default:
      return `Unknown tool: ${toolName}`;
  }
}

async function callLlm(prompt: string): Promise<{ tool: string; arguments: Record<string, unknown> } | null> {
  const response = await fetch(`${config.ollamaHost}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.llmModel,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`LLM error: ${response.status}`);
  }

  const data = await response.json() as { message: { content: string } };
  const content = data.message.content.trim();
  
  try {
    // Try standard JSON first
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tool && parsed.arguments) {
        return parsed as { tool: string; arguments: Record<string, unknown> };
      }
    }
    
    // Fallback: Handle JavaScript object notation
    const toolMatch = content.match(/tool\s*[:=]\s*['"]([^'"]+)['"]/);
    const argsMatch = content.match(/arguments\s*[:=]\s*(\{[\s\S]*\})/);
    
    if (toolMatch && argsMatch) {
      const toolName = toolMatch[1];
      try {
        const args = JSON.parse(argsMatch[1].replace(/'/g, '"'));
        return { tool: toolName, arguments: args };
      } catch {
        const queryMatch = argsMatch[1].match(/query\s*[:=]\s*['"]([^'"]+)['"]/);
        if (queryMatch) {
          return { tool: toolName, arguments: { query: queryMatch[1] } };
        }
      }
    }
  } catch (e) {
    console.log('Parse error:', e);
  }
  
  console.log('Could not parse:', content.substring(0, 150));
  return null;
}

async function processUserInput(input: string) {
  console.log('\n🤖 Processing request...\n');
  
  try {
    const decision = await callLlm(input);
    
    if (decision && decision.tool) {
      console.log(`🔧 Calling tool: ${decision.tool}`);
      const result = await executeTool(decision.tool, decision.arguments);
      console.log(`\n${result}\n`);
    } else {
      console.log('❓ Could not determine what to do. Try commands like:');
      console.log('  - "list all events"');
      console.log('  - "show all users"');
      console.log('  - "how do I create an event"');
      console.log('  - "can I register twice"\n');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  rl.question('> ', handleInput);
}

function handleInput(input: string) {
  if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
  
  if (input.trim()) {
    processUserInput(input);
  } else {
    rl.question('> ', handleInput);
  }
}

async function initialize() {
  console.log('🤖 Initializing Event Management Agent...\n');
  console.log('🎯 Agent mode: LLM decides which tool to use\n');
  console.log('🚀 Agent ready! Type your request below.\n');
  console.log('─'.repeat(50));
}

async function main() {
  try {
    await initialize();
    rl.question('> ', handleInput);
  } catch (error) {
    console.error('\n❌ Failed to start agent:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();