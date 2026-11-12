import { fileURLToPath } from "node:url";
import { ingestKnowledgeBase } from "../server/services/documentIngestion.js";
import { retrieveRelevantChunks } from "../server/services/chunkRetriever.js";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error('Usage: npm run knowledge:search -- "your customer question"');
  process.exitCode = 2;
} else {
  const knowledgeBasePath = fileURLToPath(new URL("../knowledge-base/", import.meta.url));

  try {
    const ingestion = await ingestKnowledgeBase({ knowledgeBasePath });
    const results = retrieveRelevantChunks(query, ingestion.chunks);
    console.log(JSON.stringify({
      query,
      retrievalMethod: "keyword-overlap",
      indexedChunks: ingestion.summary.chunks,
      results,
      fallback:
        results.length === 0
          ? "I don't have enough approved information to answer that confidently."
          : null,
    }, null, 2));
  } catch (error) {
    console.error("Knowledge-base search failed:", error);
    process.exitCode = 1;
  }
}
