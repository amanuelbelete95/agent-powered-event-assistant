import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import * as fs from "fs";

export async function initializeRAG() {
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
  });

  const vectorStore = new MemoryVectorStore(embeddings);

  // Load a local file to use as knowledge
//   const projectDocs = fs.readFileSync("./docs/project-info.txt", "utf-8");
  const projectDocs = [
    "This project uses MCP to connect LLMs to local tools.",
    "The RAG process uses nomic-embed-text for vectorization.",
    "The main controller is built with TypeScript."
  ];
  
  await vectorStore.addStrings([projectDocs]);
  console.log("✅ RAG Knowledge Base Loaded.");
  
  return vectorStore;
}
/*
Why MCP + RAG is Powerful in TS
By using TypeScript, you can define Interfaces for your data. This ensures that the information coming out of your RAG process matches the input requirements of your MCP tools perfectly.

The Workflow:

User asks: "What is the budget in the attached PDF?"

RAG Agent finds the text in the PDF.

MCP Agent uses a "File System" tool to verify the file's metadata or save a summary.

Chat Model combines both to give the final answer.
*/