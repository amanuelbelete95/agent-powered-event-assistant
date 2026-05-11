import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  rootDir: path.resolve(__dirname, '../'),
  srcDir: __dirname,
  
  ollamaHost: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
  llmModel: process.env.LLM_MODEL || 'llama3.2',
  
  expressApiUrl: process.env.EXPRESS_API_URL || 'http://localhost:4000',
  mcpServerPort: parseInt(process.env.MCP_PORT || '3001', 10),
  
  serviceToken: process.env.SERVICE_ACCOUNT_TOKEN || '',
};

export default config;