import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import config from './config.js';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

export interface McpClientInstance {
  connect: () => Promise<void>;
  listTools: () => Promise<McpTool[]>;
  callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>;
  getTools: () => McpTool[];
  disconnect: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  off: (event: string, listener: (...args: unknown[]) => void) => void;
}

export function createMcpClient(): McpClientInstance {
  let mcpProcess: ChildProcess | null = null;
  let requestId = 0;
  let pendingRequests = new Map<number, PendingRequest>();
  let messageBuffer = '';
  let tools: McpTool[] = [];
  let initialized = false;
  let eventEmitter = new EventEmitter();

  function waitForServer(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  function handleStdout(data: string): void {
    messageBuffer += data;
    const lines = messageBuffer.split('\n');
    messageBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response: JsonRpcResponse = JSON.parse(line);
          handleResponse(response);
        } catch {
          // Not a JSON-RPC message
        }
      }
    }
  }

  function handleResponse(response: JsonRpcResponse): void {
    const pending = pendingRequests.get(response.id);
    if (pending) {
      pendingRequests.delete(response.id);
      if (response.error) {
        pending.reject(new Error(response.error.message));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  function sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!mcpProcess) {
      return Promise.reject(new Error('Not connected to MCP server'));
    }

    const id = ++requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });

      const requestStr = JSON.stringify(request) + '\n';
      mcpProcess!.stdin?.write(requestStr);

      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  async function connect(): Promise<void> {
    if (mcpProcess) {
      throw new Error('Already connected');
    }

    console.log('[MCP Client] Spawning MCP server...');

    mcpProcess = spawn('node', ['./node_modules/tsx/dist/cli.mjs', 'src/mcp-server.ts'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    mcpProcess.stdout?.on('data', (data: Buffer) => {
      handleStdout(data.toString());
    });

    mcpProcess.stderr?.on('data', (data: Buffer) => {
      console.log('[MCP Server]', data.toString().trim());
    });

    mcpProcess.on('error', (error) => {
      console.error('[MCP Client] Process error:', error);
      eventEmitter.emit('error', error);
    });

    mcpProcess.on('close', (code) => {
      console.log(`[MCP Server] Process exited with code ${code}`);
      mcpProcess = null;
      initialized = false;
    });

    await waitForServer();

    try {
      await listTools();
      initialized = true;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await listTools();
      initialized = true;
    }

    console.log('[MCP Client] Connected to MCP server');
  }

  async function listTools(): Promise<McpTool[]> {
    console.log('[MCP Client] Fetching tool list...');

    const response = await sendRequest('tools/list') as { tools: McpTool[] };
    tools = response.tools || [];

    console.log(`[MCP Client] Found ${tools.length} tools`);
    return tools;
  }

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    console.log(`[MCP Client] Calling tool: ${name}`);

    const response = await sendRequest('tools/call', {
      name,
      arguments: args,
    }) as ToolResult;

    return response;
  }

  function getTools(): McpTool[] {
    return tools;
  }

  function disconnect(): void {
    if (mcpProcess) {
      console.log('[MCP Client] Disconnecting...');
      mcpProcess.kill();
      mcpProcess = null;
      initialized = false;
      tools = [];
      pendingRequests.clear();
    }
  }

  return {
    connect,
    listTools,
    callTool,
    getTools,
    disconnect,
    on: (event, listener) => eventEmitter.on(event, listener),
    off: (event, listener) => eventEmitter.off(event, listener),
  };
}