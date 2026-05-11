import config from './config.js';

async function main() {
  console.log('🔍 Event Management System - Agent Assistant\n');
  console.log(`   Express API: ${config.expressApiUrl}`);
  console.log(`   LLM Model: ${config.llmModel}`);
  console.log(`   MCP Server Port: ${config.mcpServerPort}`);
  console.log('\n✅ Configuration loaded successfully');
}

main().catch(console.error);