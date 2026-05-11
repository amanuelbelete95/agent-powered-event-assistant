import type { McpClientInstance, McpTool, ToolResult } from './mcp-client.js';
import config from './config.js';

export interface ToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface OrchestratorConfig {
  ollamaHost: string;
  llmModel: string;
}

export interface OrchestratorInstance {
  initialize: () => Promise<void>;
  run: (userQuery: string) => Promise<string>;
  getAvailableTools: () => McpTool[];
  shutdown: () => void;
}

export function createOrchestrator(
  client: McpClientInstance,
  orchestratorConfig?: Partial<OrchestratorConfig>
): OrchestratorInstance {
  let tools: McpTool[] = [];
  const cfg: OrchestratorConfig = {
    ollamaHost: orchestratorConfig?.ollamaHost || config.ollamaHost || 'http://127.0.0.1:11434',
    llmModel: orchestratorConfig?.llmModel || config.llmModel || 'llama3.2',
  };

  async function initialize(): Promise<void> {
    console.log('\n[Orchestrator] Initializing MCP connection...');
    await client.connect();
    tools = await client.listTools();
    console.log(`[Orchestrator] Ready with ${tools.length} tools\n`);
  }

  async function selectTool(userQuery: string): Promise<ToolCall | null> {
    const toolSchemas = buildToolSchemas();

    const prompt = `You are an AI assistant that helps users interact with an Event Management System via MCP tools.

Available tools:
${toolSchemas}

User query: "${userQuery}"

Based on the query, select the most appropriate tool and provide arguments.
Return ONLY valid JSON: {"tool": "tool_name", "arguments": {"param": "value"}}
If no tool is needed, respond with: {"tool": "none", "arguments": {}}

Consider:
- "list", "show", "get all" → use list_* tools
- "create", "make", "add new" → use create_* tools  
- "get", "find", "retrieve" with ID → use get_* tools with id parameter
- "register", "sign up" → use register_to_event tool
- "delete", "remove" → use delete_* tools

Respond with ONLY JSON, no other text.`;

    try {
      const response = await fetch(`${cfg.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.llmModel,
          stream: false,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json() as { message: { content: string } };
      const content = data.message.content.trim();

      const patterns = [
        /\{[\s\S]*?"tool"[\s\S]*?\}/,
        /\{[^}]+\}/,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]) as ToolCall;
            if (parsed.tool && parsed.tool !== 'none') {
              console.log(`[Step 1] LLM selected: ${parsed.tool}`);
              return parsed;
            }
          } catch {
            // Continue to next pattern
          }
        }
      }

      const toolNameMatch = content.match(/"tool"\s*:\s*"([^"]+)"/);
      if (toolNameMatch) {
        const toolName = toolNameMatch[1];
        console.log(`[Step 1] LLM selected (fallback): ${toolName}`);
        return { tool: toolName, arguments: {} };
      }

      console.log('[Step 1] Could not parse tool selection, defaulting to list_events');
      return { tool: 'list_events', arguments: {} };
    } catch (error) {
      console.error('[Step 1] LLM tool selection failed:', error);
      return { tool: 'list_events', arguments: {} };
    }
  }

  async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    return await client.callTool(toolCall.tool, toolCall.arguments);
  }

  async function generateFinalResponse(userQuery: string, toolResult: ToolResult): Promise<string> {
    const resultText = toolResult.content.map((c) => c.text).join('\n');

    const prompt = `Original user query: "${userQuery}"

Tool execution result:
${resultText}

Provide a helpful, natural language response to the user based on this result.
If the result contains an error, explain the error to the user clearly.
If the result is data (like a list), format it nicely for the user.`;

    try {
      const response = await fetch(`${cfg.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.llmModel,
          stream: false,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json() as { message: { content: string } };
      return data.message.content;
    } catch (error) {
      console.error('[Step 3] LLM response generation failed:', error);
      return `Result: ${resultText}\n\n(Note: Could not format response - showing raw result)`;
    }
  }

  async function generateDirectResponse(userQuery: string): Promise<string> {
    const prompt = `You are a helpful assistant for an Event Management System.

User query: "${userQuery}"

Respond helpfully to the user's query. If they want to perform an action, 
suggest what command they could use.`;

    try {
      const response = await fetch(`${cfg.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.llmModel,
          stream: false,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json() as { message: { content: string } };
      return data.message.content;
    } catch (error) {
      return `I couldn't process that request. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  function buildToolSchemas(): string {
    return tools
      .map((t) => {
        const params = t.inputSchema.properties
          ? Object.entries(t.inputSchema.properties)
              .map(([key, val]) => `  - ${key}: ${val.description || val.type}`)
              .join('\n')
          : '  (no parameters)';

        return `- ${t.name}: ${t.description}\n  Parameters:\n${params}`;
      })
      .join('\n\n');
  }

  async function run(userQuery: string): Promise<string> {
    console.log('─'.repeat(60));
    console.log(`[Orchestrator] Processing: "${userQuery}"`);
    console.log('─'.repeat(60));

    console.log('\n[Step 1] Selecting tool via LLM...');
    const toolCall = await selectTool(userQuery);

    if (!toolCall || toolCall.tool === 'none') {
      console.log('[Step 2] No tool needed - generating direct response...');
      return await generateDirectResponse(userQuery);
    }

    console.log(`[Step 2] Executing tool: ${toolCall.tool}`);
    let toolResult: ToolResult;

    try {
      toolResult = await executeToolCall(toolCall);
    } catch (error) {
      console.error('[Step 2] Tool execution failed:', error);
      return `Error executing tool: ${error instanceof Error ? error.message : String(error)}`;
    }

    console.log('[Step 3] Generating final response via LLM...');
    const finalResponse = await generateFinalResponse(userQuery, toolResult);

    return finalResponse;
  }

  function getAvailableTools(): McpTool[] {
    return tools;
  }

  function shutdown(): void {
    client.disconnect();
    console.log('\n[Orchestrator] Shutdown complete');
  }

  return {
    initialize,
    run,
    getAvailableTools,
    shutdown,
  };
}