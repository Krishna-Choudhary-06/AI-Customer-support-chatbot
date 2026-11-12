import { fileURLToPath } from "node:url";
import { ingestKnowledgeBase } from "../server/services/documentIngestion.js";

const knowledgeBasePath = fileURLToPath(new URL("../knowledge-base/", import.meta.url));

try {
  const result = await ingestKnowledgeBase({ knowledgeBasePath });
  console.log(JSON.stringify({
    generatedAt: result.generatedAt,
    knowledgeBasePath: result.knowledgeBasePath,
    maxChunkCharacters: result.maxChunkCharacters,
    summary: result.summary,
    documentResults: result.documentResults,
    chunks: result.chunks,
  }, null, 2));
} catch (error) {
  console.error("Knowledge-base ingestion failed:", error);
  process.exitCode = 1;
}
