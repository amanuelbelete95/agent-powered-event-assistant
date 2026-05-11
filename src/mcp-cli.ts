import readline from 'readline';
import { createMcpClient } from './mcp-client.js';
import { createOrchestrator } from './mcp-orchestrator.js';
import type { OrchestratorInstance } from './mcp-orchestrator.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(color + message + colors.reset);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let orchestrator: OrchestratorInstance;

async function main() {
  log('\n╔═══════════════════════════════════════════════════════════╗', colors.green);
  log('║     MCP Agent Orchestration Demo - Event Management       ║', colors.green);
  log('╚═══════════════════════════════════════════════════════════╝\n', colors.green);

  log('Initializing MCP Client...', colors.yellow);
  const client = createMcpClient();

  log('Creating Orchestrator...', colors.yellow);
  orchestrator = createOrchestrator(client);

  try {
    await orchestrator.initialize();
  } catch (error) {
    log(`\n✗ Failed to initialize: ${error instanceof Error ? error.message : String(error)}\n`, colors.red);
    process.exit(1);
  }

  // log('\nAvailable tools:', colors.cyan);
  // const tools = orchestrator.getAvailableTools();
  // tools.forEach((t: { name: string; description: string }) => log(`  • ${t.name}: ${t.description}`, colors.reset));
  // log('');

  promptUser();
}

function promptUser(): void {
  rl.question(colors.green + '> ' + colors.reset, async (query) => {
    const trimmed = query.trim().toLowerCase();

    if (trimmed === 'exit' || trimmed === 'quit' || trimmed === 'q') {
      log('\n👋 Goodbye!', colors.yellow);
      orchestrator.shutdown();
      rl.close();
      return;
    }

    if (!trimmed) {
      promptUser();
      return;
    }

    try {
      const result = await orchestrator.run(query);
      log('\n' + '─'.repeat(60), colors.cyan);
      log('Response:', colors.bold);
      console.log(result);
      log('─'.repeat(60) + '\n', colors.cyan);
    } catch (error) {
      log(`\n✗ Error: ${error instanceof Error ? error.message : String(error)}\n`, colors.red);
    }

    promptUser();
  });
}

main().catch((error) => {
  log(`\n✗ Fatal error: ${error instanceof Error ? error.message : String(error)}\n`, colors.red);
  process.exit(1);
});