import { createServer as createHttpServer } from "node:http";
import { ingestKnowledgeBase } from "./services/documentIngestion.js";
import { retrieveRelevantChunks } from "./services/chunkRetriever.js";
import {
  generateEmbedding,
  OllamaEmbeddingError,
} from "./services/ollamaEmbeddingService.js";
import { createEmbeddingCache } from "./services/embeddingCache.js";
import { retrieveSemanticChunks } from "./services/semanticChunkRetriever.js";
import { loadFaqEntries, retrieveRelevantFaqs } from "./services/faqRetriever.js";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3001;
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5:3b";
const DEFAULT_OLLAMA_EMBEDDING_MODEL = "nomic-embed-text";
const DEFAULT_SEMANTIC_MINIMUM_SIMILARITY = 0.5;
const DEFAULT_EMBEDDING_CACHE_PATH = fileURLToPath(
  new URL("./.cache/semantic-embeddings.json", import.meta.url),
);
const MAX_MESSAGE_LENGTH = 2000;
const MAX_REQUEST_BYTES = 16 * 1024;
const OLLAMA_TIMEOUT_MS = 90_000;
const NO_FAQ_REPLY =
  "I don't have enough information in ShopEase's current support information to answer that confidently.";
const GROUNDED_ANSWER_INSTRUCTIONS = [
  "You are ShopEase's customer support assistant.",
  "Choose the single answer that best answers the customer's question using only the supplied approved ShopEase knowledge context.",
  "Return the selected answer exactly as written in the supplied context.",
  "Do not add a greeting, explanation, outside knowledge, or any other text.",
].join(" ");

const GROUNDED_CHUNK_INSTRUCTIONS = [
  "You are ShopEase's customer support assistant.",
  "Use only the supplied approved ShopEase knowledge chunks to answer.",
  "Return one complete relevant chunk exactly as written, with no additions or edits.",
  "Do not use outside knowledge or infer missing policies.",
].join(" ");

function normalizeAnswer(value) {
  return value.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "").toLowerCase();
}

function formatChunkContext(chunks) {
  return chunks
    .map((chunk) =>
      [
        `Source: ${chunk.source}`,
        `Source reference: ${chunk.sourceReference ?? "unspecified"}`,
        `Document: ${chunk.title} (${chunk.documentId})`,
        `Industry: ${chunk.industry ?? "unspecified"}`,
        `Content:\n${chunk.text}`,
      ].join("\n"),
    )
    .join("\n\n");
}

function selectExactChunk(generatedReply, chunks) {
  if (typeof generatedReply !== "string") {
    return null;
  }
  return chunks.find((chunk) => normalizeAnswer(chunk.text) === normalizeAnswer(generatedReply)) ?? null;
}

async function retrieveSemanticMatches({
  query,
  chunks,
  embeddingCache,
  ollamaBaseUrl,
  model,
  fetchImpl,
  minimumSimilarity,
}) {
  if (chunks.length === 0) {
    return [];
  }

  const embeddedChunks = await Promise.all(chunks.map(async (chunk) => ({
    ...chunk,
    embedding: await embeddingCache.getEmbedding(chunk),
  })));
  const queryEmbedding = await generateEmbedding(query, {
    ollamaBaseUrl,
    model,
    fetchImpl,
    expectedDimensions: embeddedChunks[0].embedding.length,
  });

  return retrieveSemanticChunks(queryEmbedding, embeddedChunks, {
    minimumSimilarity,
  });
}

async function requestOllama({ fetchImpl, ollamaChatUrl, ollamaModel, systemPrompt, userPrompt }) {
  return fetchImpl(ollamaChatUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
  });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readJsonBody(request) {
  if (!request.headers["content-type"]?.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json.");
  }

  const chunks = [];
  let bytesRead = 0;
  for await (const chunk of request) {
    bytesRead += chunk.length;
    if (bytesRead > MAX_REQUEST_BYTES) {
      throw new HttpError(413, "Request body is too large.");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new HttpError(400, "Request body must contain valid JSON.");
    }
    throw error;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

export function createServer({
  ollamaBaseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
  ollamaModel = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
  retrievalMode = process.env.RETRIEVAL_MODE || "keyword",
  embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_OLLAMA_EMBEDDING_MODEL,
  embeddingCachePath = process.env.SEMANTIC_EMBEDDING_CACHE_PATH || DEFAULT_EMBEDDING_CACHE_PATH,
  semanticMinimumSimilarity = Number(
    process.env.SEMANTIC_MINIMUM_SIMILARITY || `${DEFAULT_SEMANTIC_MINIMUM_SIMILARITY}`,
  ),
  knowledgeBasePath = fileURLToPath(new URL("../knowledge-base/", import.meta.url)),
  fetchImpl = fetch,
} = {}) {
  if (retrievalMode !== "keyword" && retrievalMode !== "semantic") {
    throw new TypeError('RETRIEVAL_MODE must be either "keyword" or "semantic".');
  }
  if (
    typeof semanticMinimumSimilarity !== "number"
    || !Number.isFinite(semanticMinimumSimilarity)
    || semanticMinimumSimilarity < 0
    || semanticMinimumSimilarity > 1
  ) {
    throw new RangeError("SEMANTIC_MINIMUM_SIMILARITY must be between 0 and 1.");
  }

  const ollamaChatUrl = `${ollamaBaseUrl.replace(/\/+$/, "")}/api/chat`;
  const embeddingCache = createEmbeddingCache({
    cachePath: embeddingCachePath,
    model: embeddingModel,
    embedText: (text, { model }) => generateEmbedding(text, {
      ollamaBaseUrl,
      model,
      fetchImpl,
    }),
  });

  return createHttpServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/api/chat") {
      sendJson(response, 404, { error: "Endpoint not found." });
      return;
    }

    try {
      const body = await readJsonBody(request);
      if (typeof body?.message !== "string" || !body.message.trim()) {
        throw new HttpError(400, "Message must be a non-empty string.");
      }

      const message = body.message.trim();
      if (message.length > MAX_MESSAGE_LENGTH) {
        throw new HttpError(413, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      }

      const ingestion = await ingestKnowledgeBase({ knowledgeBasePath });
      let relevantChunks;
      if (retrievalMode === "semantic") {
        try {
          relevantChunks = await retrieveSemanticMatches({
            query: message,
            chunks: ingestion.chunks,
            embeddingCache,
            ollamaBaseUrl,
            model: embeddingModel,
            fetchImpl,
            minimumSimilarity: semanticMinimumSimilarity,
          });
        } catch (error) {
          if (error instanceof OllamaEmbeddingError) {
            const modelHint = error.status === 404
              ? ` The embedding model "${embeddingModel}" may not be installed; run "ollama pull ${embeddingModel}".`
              : "";
            sendJson(response, 503, {
              error: `Semantic retrieval is unavailable: ${error.message}${modelHint}`,
            });
            return;
          }
          throw error;
        }
      } else {
        relevantChunks = retrieveRelevantChunks(message, ingestion.chunks);
      }

      if (relevantChunks.length > 0) {
        const chunkContext = formatChunkContext(relevantChunks);
        let chunkResponse;
        try {
          chunkResponse = await requestOllama({
            fetchImpl,
            ollamaChatUrl,
            ollamaModel,
            systemPrompt: GROUNDED_CHUNK_INSTRUCTIONS,
            userPrompt: `Approved ShopEase knowledge:\n${chunkContext}\n\nCustomer question:\n${message}`,
          });
        } catch (error) {
          if (error.name === "TimeoutError" || error.name === "AbortError") {
            sendJson(response, 504, {
              error: "The local AI model took too long to respond. Please try again.",
            });
            return;
          }
          if (error instanceof TypeError) {
            sendJson(response, 503, {
              error: "Local AI is unavailable. Start Ollama and try again.",
            });
            return;
          }
          throw error;
        }

        if (!chunkResponse.ok) {
          console.error(`Ollama returned HTTP ${chunkResponse.status}.`);
          sendJson(response, chunkResponse.status === 404 ? 503 : 502, {
            error: chunkResponse.status === 404
              ? `The local model "${ollamaModel}" is unavailable. Install it with "ollama pull ${ollamaModel}" and try again.`
              : "The local AI service could not answer. Please try again.",
          });
          return;
        }

        let chunkResult;
        try {
          chunkResult = await chunkResponse.json();
        } catch (error) {
          if (error instanceof SyntaxError) {
            sendJson(response, 502, { error: "The local AI service returned an invalid response." });
            return;
          }
          throw error;
        }

        const selectedChunk = selectExactChunk(
          chunkResult?.message?.content,
          relevantChunks,
        );
        const fallbackChunk = relevantChunks[0];
        const replyChunk = selectedChunk ?? fallbackChunk;
        if (!selectedChunk) {
          console.warn("Ollama response did not exactly match approved knowledge; returning the retrieved chunk verbatim.");
        }

        sendJson(response, 200, {
          reply: replyChunk.text,
          sources: [{
            documentId: replyChunk.documentId,
            title: replyChunk.title,
            source: replyChunk.source,
            sourceReference: replyChunk.sourceReference,
            chunkId: replyChunk.chunkId,
            retrieval: replyChunk.retrieval,
          }],
        });
        return;
      }

      const entries = await loadFaqEntries(knowledgeBasePath);
      const relevantFaqs = retrieveRelevantFaqs(message, entries);
      if (relevantFaqs.length === 0) {
        sendJson(response, 200, { reply: NO_FAQ_REPLY });
        return;
      }

      const faqContext = relevantFaqs
        .map((entry) =>
          `Source: ${entry.source} (${entry.category})\nQ: ${entry.question}\nA: ${entry.answer}`,
        )
        .join("\n\n");

      let ollamaResponse;
      try {
        ollamaResponse = await requestOllama({
          fetchImpl,
          ollamaChatUrl,
          ollamaModel,
          systemPrompt: GROUNDED_ANSWER_INSTRUCTIONS,
          userPrompt: `ShopEase FAQ context:\n${faqContext}\n\nCustomer question:\n${message}`,
        });
      } catch (error) {
        if (error.name === "TimeoutError" || error.name === "AbortError") {
          sendJson(response, 504, {
            error: "The local AI model took too long to respond. Please try again.",
          });
          return;
        }

        if (error instanceof TypeError) {
          sendJson(response, 503, {
            error: "Local AI is unavailable. Start Ollama and try again.",
          });
          return;
        }

        throw error;
      }

      if (!ollamaResponse.ok) {
        console.error(`Ollama returned HTTP ${ollamaResponse.status}.`);
        if (ollamaResponse.status === 404) {
          sendJson(response, 503, {
            error: `The local model "${ollamaModel}" is unavailable. Install it with "ollama pull ${ollamaModel}" and try again.`,
          });
          return;
        }

        sendJson(response, 502, {
          error: "The local AI service could not answer. Please try again.",
        });
        return;
      }

      let result;
      try {
        result = await ollamaResponse.json();
      } catch (error) {
        if (error instanceof SyntaxError) {
          sendJson(response, 502, { error: "The local AI service returned an invalid response." });
          return;
        }
        throw error;
      }

      const generatedReply = result?.message?.content;
      const matchedFaq = typeof generatedReply === "string"
        ? relevantFaqs.find(
          (entry) => normalizeAnswer(entry.answer) === normalizeAnswer(generatedReply),
        )
        : null;
      const reply = matchedFaq?.answer || relevantFaqs[0].answer;
      if (!matchedFaq) {
        console.warn("Ollama response did not exactly match a retrieved ShopEase FAQ; using the FAQ answer.");
      }

      sendJson(response, 200, { reply });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      console.error("Unexpected error handling POST /api/chat:", error);
      sendJson(response, 500, { error: "An unexpected server error occurred." });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number.parseInt(process.env.PORT || `${DEFAULT_PORT}`, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const host = process.env.HOST || DEFAULT_HOST;
  createServer().listen(port, host, () => {
    console.log(`Customer support API listening at http://${host}:${port}`);
    console.log(`Using local Ollama model "${process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL}".`);
  });
}