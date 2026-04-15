import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  rootDir: path.resolve(__dirname, '../'),
  srcDir: __dirname,
  
  ragDocsPath: path.join(__dirname, 'rag', 'docs'),
  apiMapPath: path.join(__dirname, 'rag', 'docs', 'api-map.md'),
  
  ollamaHost: process.env.OLLAMA_HOST,
  embeddingModel: process.env.EMBEDDING_MODEL,
  llmModel: process.env.LLM_MODEL,
  
  expressApiUrl: process.env.EXPRESS_API_URL || 'http://localhost:4000',
  mcpServerPort: parseInt(process.env.MCP_PORT || '3001', 10),
  
  serviceToken: process.env.SERVICE_ACCOUNT_TOKEN || '',
  
  rag: {
    chunkSize: 500,
    topK: 3,
  }
};

export default config;