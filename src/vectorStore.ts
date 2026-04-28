import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text", 
});

// This turns your text into the math vectors we discussed
const vectorStore = await MemoryVectorStore.fromTexts(
  ["Your document text here"],
  [{ id: 1 }],
  embeddings
);

/*
Why MCP + RAG is Powerful in TS
By using TypeScript, you can define Interfaces for your data. This ensures that the information coming out of your RAG process matches the input requirements of your MCP tools perfectly.

The Workflow:

User asks: "What is the budget in the attached PDF?"

RAG Agent finds the text in the PDF.

MCP Agent uses a "File System" tool to verify the file's metadata or save a summary.

Chat Model combines both to give the final answer.
*/