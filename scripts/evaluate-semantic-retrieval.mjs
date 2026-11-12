import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateEmbedding } from "../server/services/ollamaEmbeddingService.js";
import { ingestKnowledgeBase } from "../server/services/documentIngestion.js";
import { retrieveSemanticChunks } from "../server/services/semanticChunkRetriever.js";

const knowledgeBasePath = fileURLToPath(new URL("../knowledge-base/", import.meta.url));
const datasetPath = new URL(
  "../tests/fixtures/semantic-retrieval-evaluation.json",
  import.meta.url,
);
const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";

function validateDataset(dataset) {
  if (
    !Array.isArray(dataset.chunkDocumentIds)
    || dataset.chunkDocumentIds.length === 0
    || !Array.isArray(dataset.thresholds)
    || dataset.thresholds.length === 0
    || !Array.isArray(dataset.cases)
    || dataset.cases.length === 0
  ) {
    throw new TypeError("Evaluation dataset requires chunkDocumentIds, thresholds, and cases.");
  }
  if (dataset.thresholds.some((threshold) =>
    typeof threshold !== "number" || threshold < -1 || threshold > 1
  )) {
    throw new RangeError("Evaluation thresholds must be numbers between -1 and 1.");
  }
  for (const testCase of dataset.cases) {
    if (
      typeof testCase.id !== "string"
      || typeof testCase.query !== "string"
      || !testCase.query.trim()
      || !(testCase.expectedDocumentId === null || typeof testCase.expectedDocumentId === "string")
    ) {
      throw new TypeError("Each evaluation case requires id, query, and expectedDocumentId.");
    }
  }
}

function evaluateAtThreshold(testCases, chunks, threshold) {
  const outcomes = testCases.map((testCase) => {
    const results = retrieveSemanticChunks(testCase.embedding, chunks, {
      minimumSimilarity: threshold,
      limit: 1,
    });
    const predictedDocumentId = results[0]?.documentId ?? null;
    return {
      id: testCase.id,
      category: testCase.category,
      expectedDocumentId: testCase.expectedDocumentId,
      predictedDocumentId,
      score: testCase.topScore,
      correct: predictedDocumentId === testCase.expectedDocumentId,
    };
  });
  const correct = outcomes.filter((outcome) => outcome.correct).length;
  return {
    threshold,
    correct,
    total: outcomes.length,
    accuracy: correct / outcomes.length,
    outcomes,
  };
}

try {
  const dataset = JSON.parse(await readFile(datasetPath, "utf8"));
  validateDataset(dataset);

  const ingestion = await ingestKnowledgeBase({ knowledgeBasePath });
  const selectedChunks = ingestion.chunks.filter((chunk) =>
    dataset.chunkDocumentIds.includes(chunk.documentId),
  );
  if (selectedChunks.length === 0) {
    throw new Error(
      "No approved ingested chunks match the dataset document IDs. Check fixture approval and ingestion output.",
    );
  }

  const embeddedChunks = [];
  for (const chunk of selectedChunks) {
    embeddedChunks.push({
      ...chunk,
      embedding: await generateEmbedding(chunk.text, { model: embeddingModel }),
    });
  }

  const embeddedCases = [];
  for (const testCase of dataset.cases) {
    embeddedCases.push({
      ...testCase,
      embedding: await generateEmbedding(testCase.query, { model: embeddingModel }),
    });
  }

  const scoreOnlyResults = embeddedCases.map((testCase) => {
    const result = retrieveSemanticChunks(testCase.embedding, embeddedChunks, {
      minimumSimilarity: -1,
      limit: 1,
    })[0];
    return {
      ...testCase,
      topScore: result?.retrieval.score ?? null,
      topDocumentId: result?.documentId ?? null,
      topChunkId: result?.chunkId ?? null,
    };
  });
  const resultsByThreshold = dataset.thresholds.map((threshold) => {
    return evaluateAtThreshold(scoreOnlyResults, embeddedChunks, threshold);
  });

  console.log(JSON.stringify({
    embeddingModel,
    eligibleDocuments: ingestion.summary.eligibleDocuments,
    indexedChunks: embeddedChunks.length,
    evaluationCases: dataset.cases.length,
    note: "Diagnostic evaluation only. Scores are model- and dataset-specific; do not adopt a threshold from this small set alone.",
    perQueryTopScores: scoreOnlyResults.map((testCase) => ({
      id: testCase.id,
      category: testCase.category,
      expectedDocumentId: testCase.expectedDocumentId,
      topDocumentId: testCase.topDocumentId,
      topChunkId: testCase.topChunkId,
      topScore: testCase.topScore,
    })),
    resultsByThreshold,
  }, null, 2));
} catch (error) {
  console.error("Semantic retrieval evaluation failed:", error);
  process.exitCode = 1;
}
