import fs from 'fs';
import config from './config.js';

interface Chunk {
  id: string;
  content: string;
  embedding: number[];
}

interface SearchResult {
  chunk: Chunk;
  score: number;
}

let chunks: Chunk[] = [];
let isInitialized = false;

function loadApiMap(): void {
  if (!fs.existsSync(config.apiMapPath)) {
    throw new Error(`API Map not found at ${config.apiMapPath}. Run discovery-script.ts first.`);
  }

  const content = fs.readFileSync(config.apiMapPath, 'utf-8');
  const rawChunks = chunkText(content, config.rag.chunkSize);

  console.log(`📚 Loading ${rawChunks.length} chunks into RAG...`);

  for (let i = 0; i < rawChunks.length; i++) {
    chunks.push({
      id: `chunk-${i}`,
      content: rawChunks[i],
      embedding: []
    });
  }

  isInitialized = true;
}

async function embedChunks(): Promise<void> {
  console.log(`🔄 Embedding ${chunks.length} chunks...`);
  
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i].content);
    chunks[i].embedding = embedding;
    console.log(`  Embedded chunk ${i + 1}/${chunks.length}`);
  }
  
  console.log(`✅ All chunks embedded`);
}

function chunkText(text: string, chunkSize: number): string[] {
  const result: string[] = [];
  const lines = text.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    if ((currentChunk.length + line.length) > chunkSize && currentChunk.length > 0) {
      result.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += line + '\n';
  }

  if (currentChunk.trim()) {
    result.push(currentChunk.trim());
  }

  return result;
}

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${config.ollamaHost}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.embeddingModel,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { embedding: number[] };
    return data.embedding;
  } catch (error) {
    console.error('❌ Embedding error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function search(query: string, topK: number = config.rag.topK): Promise<SearchResult[]> {
  if (!isInitialized || chunks.length === 0 || chunks[0].embedding.length === 0) {
    throw new Error('RAG not initialized. Call loadApiMap() and embedChunks() first.');
  }

  const queryEmbedding = await getEmbedding(query);

  const results: SearchResult[] = chunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

function getChunks(): Chunk[] {
  return chunks;
}

function isReady(): boolean {
  return isInitialized && chunks.length > 0 && chunks[0].embedding.length > 0;
}

export { loadApiMap, embedChunks, search, getChunks, isReady, type Chunk, type SearchResult };