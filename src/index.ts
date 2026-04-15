import config from './config.js';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║          Event Management AI Agent System                  ║
║          (MCP + RAG Implementation)                          ║
╚═══════════════════════════════════════════════════════════╝

Available commands:
  npm run agent    - Start main interactive agent
  npm run mcp      - Start MCP server (stdio mode)
  npm run discover - Regenerate API documentation
  npm run test     - Quick test of RAG system
`);

// Check if specific command is passed
const args = process.argv.slice(2);
const command = args[0];

if (command === 'agent' || !command) {
  console.log('\nTo start the agent, run: npm run agent\n');
}

console.log(`Config:
  - Express API: ${config.expressApiUrl}
  - Ollama: ${config.ollamaHost}
  - LLM Model: ${config.llmModel}
  - Embedding Model: ${config.embeddingModel}
`);