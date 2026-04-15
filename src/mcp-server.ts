import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import config from './config.js';

const server = new Server(
  {
    name: 'event-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.serviceToken) {
    headers['Authorization'] = `Bearer ${config.serviceToken}`;
  }
  return headers;
}

async function callApi<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const url = `${config.expressApiUrl}${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json() as Promise<T>;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'register_user',
        description: 'Register a new user account',
        inputSchema: {
          type: 'object',
          properties: {
            firstname: { type: 'string', description: 'User first name' },
            lastname: { type: 'string', description: 'User last name' },
            username: { type: 'string', description: 'Unique username' },
            password: { type: 'string', description: 'User password' },
            confirmPassword: { type: 'string', description: 'Password confirmation' },
          },
          required: ['firstname', 'lastname', 'username', 'password', 'confirmPassword'],
        },
      },
      {
        name: 'login_user',
        description: 'Authenticate a user with username and password, returns JWT token',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username' },
            password: { type: 'string', description: 'Password' },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the current authenticated user from JWT token',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_users',
        description: 'Get all users from the database',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_user',
        description: 'Get a specific user by their ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'User ID' } },
          required: ['id'],
        },
      },
      {
        name: 'update_user',
        description: 'Update user details (firstname, lastname, or role)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'User ID' },
            firstname: { type: 'string', description: 'Updated first name' },
            lastname: { type: 'string', description: 'Updated last name' },
            role: { type: 'string', description: 'Updated role' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a user by their ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'User ID to delete' } },
          required: ['id'],
        },
      },
      {
        name: 'create_event',
        description: 'Create a new event',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Event name' },
            location: { type: 'string', description: 'Event location' },
            event_date: { type: 'string', description: 'Event date (ISO8601)' },
            event_status: { type: 'string', description: 'Event status' },
            capacity: { type: 'number', description: 'Maximum capacity' },
            description: { type: 'string', description: 'Event description' },
          },
          required: ['name', 'location', 'event_date', 'event_status', 'capacity', 'description'],
        },
      },
      {
        name: 'list_events',
        description: 'Get all events with registration status',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_event',
        description: 'Get a specific event by its ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Event ID' } },
          required: ['id'],
        },
      },
      {
        name: 'update_event',
        description: 'Update an existing event by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Event ID' },
            name: { type: 'string', description: 'Updated event name' },
            location: { type: 'string', description: 'Updated location' },
            event_date: { type: 'string', description: 'Updated event date' },
            event_status: { type: 'string', description: 'Updated status' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['id', 'name', 'location'],
        },
      },
      {
        name: 'delete_event',
        description: 'Delete an event by its ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Event ID to delete' } },
          required: ['id'],
        },
      },
      {
        name: 'register_to_event',
        description: 'Register a user for an event',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: { type: 'number', description: 'Event ID' },
            user_id: { type: 'number', description: 'User ID' },
            reason: { type: 'string', description: 'Reason for registration' },
            registered_on: { type: 'string', description: 'Registration date' },
            position: { type: 'number', description: 'Position number' },
          },
          required: ['event_id', 'user_id', 'reason'],
        },
      },
      {
        name: 'list_my_registrations',
        description: 'Get all events the current user is registered for',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'check_registration',
        description: 'Check if a user is registered for an event',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: { type: 'number', description: 'Event ID' },
            userId: { type: 'number', description: 'User ID' },
          },
          required: ['eventId', 'userId'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case 'register_user':
        result = await callApi('POST', '/api/register', args);
        break;
      case 'login_user':
        result = await callApi('POST', '/api/login', args);
        break;
      case 'get_current_user':
        result = await callApi('GET', '/api/me');
        break;
      case 'list_users':
        result = await callApi('GET', '/api/users');
        break;
      case 'get_user':
        result = await callApi('GET', `/api/users/${args.id}`);
        break;
      case 'update_user':
        result = await callApi('PUT', `/api/users/${args.id}`, args);
        break;
      case 'delete_user':
        result = await callApi('DELETE', `/api/users/${args.id}/delete`);
        break;
      case 'create_event':
        result = await callApi('POST', '/api/events', args);
        break;
      case 'list_events':
        result = await callApi('GET', '/api/events');
        break;
      case 'get_event':
        result = await callApi('GET', `/api/events/${args.id}`);
        break;
      case 'update_event':
        result = await callApi('PUT', `/api/events/${args.id}/update`, args);
        break;
      case 'delete_event':
        result = await callApi('DELETE', `/api/events/${args.id}/delete`);
        break;
      case 'register_to_event':
        result = await callApi('POST', '/api/event-register', args);
        break;
      case 'list_my_registrations':
        result = await callApi('GET', '/api/event-register');
        break;
      case 'check_registration':
        result = await callApi('GET', `/api/event-register/check?eventId=${args.eventId}&userId=${args.userId}`);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('🎯 MCP Server running on stdio');
}

run().catch(console.error);