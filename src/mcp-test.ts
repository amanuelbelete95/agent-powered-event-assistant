import { createMcpClient } from './mcp-client.js';
import { createOrchestrator } from './mcp-orchestrator.js';

async function test() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     MCP Orchestration Test - Tool Discovery & Execution   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const client = createMcpClient();
  const orchestrator = createOrchestrator(client);

  await orchestrator.initialize();

  // Test queries to demonstrate the flow
  const testQueries = [
    'list all events',
    'show me all users',
  ];

  for (const query of testQueries) {
    console.log('\n' + '='.repeat(60));
    console.log(`TEST QUERY: "${query}"`);
    console.log('='.repeat(60));

    try {
      const result = await orchestrator.run(query);
      console.log('\nFinal Response:');
      console.log(result);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  console.log('\nTest complete!');
  orchestrator.shutdown();
}

test().catch(console.error);