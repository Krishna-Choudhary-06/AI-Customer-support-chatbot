const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_EMBEDDING_MODEL = "nomic-embed-text";
const DEFAULT_TIMEOUT_MS = 30_000;

export class OllamaEmbeddingError extends Error {
  constructor(message, { cause, status } = {}) {
    super(message, { cause });
    this.name = "OllamaEmbeddingError";
    if (status !== undefined) {
      this.status = status;
    }
  }
}

export async function generateEmbedding(text, {
  ollamaBaseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
  model = process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_OLLAMA_EMBEDDING_MODEL,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  expectedDimensions,
} = {}) {
  if (typeof text !== "string" || !text.trim()) {
    throw new TypeError("text must be a non-empty string.");
  }
  if (typeof ollamaBaseUrl !== "string" || !ollamaBaseUrl.trim()) {
    throw new TypeError("ollamaBaseUrl must be a non-empty string.");
  }
  if (typeof model !== "string" || !model.trim()) {
    throw new TypeError("model must be a non-empty string.");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl must be a function.");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("timeoutMs must be a positive integer.");
  }
  if (
    expectedDimensions !== undefined
    && (!Number.isInteger(expectedDimensions) || expectedDimensions < 1)
  ) {
    throw new RangeError("expectedDimensions must be a positive integer.");
  }

  const endpoint = `${ollamaBaseUrl.replace(/\/+$/, "")}/api/embed`;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: text }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new OllamaEmbeddingError(
        `Ollama embedding request timed out after ${timeoutMs} ms.`,
        { cause: error },
      );
    }
    throw new OllamaEmbeddingError("Could not reach the Ollama embedding service.", {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new OllamaEmbeddingError(
      `Ollama embedding request failed with HTTP ${response.status}.`,
      { status: response.status },
    );
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new OllamaEmbeddingError("Ollama returned invalid JSON for the embedding request.", {
        cause: error,
      });
    }
    throw error;
  }

  const embeddings = result?.embeddings;
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    throw new OllamaEmbeddingError("Ollama response is missing embeddings.");
  }
  if (embeddings.length !== 1 || !Array.isArray(embeddings[0])) {
    throw new OllamaEmbeddingError("Ollama response must contain exactly one embedding vector.");
  }

  const embedding = embeddings[0];
  if (embedding.length === 0) {
    throw new OllamaEmbeddingError("Ollama returned an empty embedding vector.");
  }
  if (!embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new OllamaEmbeddingError("Ollama embedding values must all be finite numbers.");
  }
  if (expectedDimensions !== undefined && embedding.length !== expectedDimensions) {
    throw new OllamaEmbeddingError(
      `Ollama returned an embedding with ${embedding.length} dimensions; expected ${expectedDimensions}.`,
    );
  }

  return embedding;
}
