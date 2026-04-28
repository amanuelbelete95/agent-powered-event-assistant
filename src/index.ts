import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

async function setupRAG() {
  // 1. Initialize the Embedding Model (The Librarian)
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  });

  // 2. Create the Vector Store
  // In a real project, you'd load a PDF or Text file here
  const vectorStore = new MemoryVectorStore(embeddings);

  // 3. Add your project documentation to the "Memory"
  await vectorStore.addStrings([
    "This project uses MCP to connect LLMs to local tools.",
    "The RAG process uses nomic-embed-text for vectorization.",
    "The main controller is built with TypeScript."
  ]);

  console.log("RAG system is ready!");
  return vectorStore;
}

setupRAG();