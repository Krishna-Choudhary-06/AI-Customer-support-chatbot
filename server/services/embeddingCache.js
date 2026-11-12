import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const CACHE_VERSION = 1;

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

function validateEmbedding(embedding, label) {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new TypeError(`${label} must be a non-empty array.`);
  }
  if (!embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new TypeError(`${label} must contain only finite numbers.`);
  }
}

function validateCache(cache, cachePath) {
  if (
    !cache
    || cache.version !== CACHE_VERSION
    || typeof cache.model !== "string"
    || !Array.isArray(cache.entries)
  ) {
    throw new Error(`Embedding cache has an invalid format: ${cachePath}`);
  }

  let dimensions = null;
  for (const entry of cache.entries) {
    if (
      !entry
      || typeof entry.chunkId !== "string"
      || typeof entry.textHash !== "string"
      || !/^[a-f0-9]{64}$/.test(entry.textHash)
    ) {
      throw new Error(`Embedding cache contains an invalid entry: ${cachePath}`);
    }
    validateEmbedding(entry.embedding, "cached embedding");
    if (dimensions !== null && entry.embedding.length !== dimensions) {
      throw new Error(`Embedding cache contains inconsistent vector dimensions: ${cachePath}`);
    }
    dimensions = entry.embedding.length;
  }
}

export function createEmbeddingCache({ cachePath, model, embedText } = {}) {
  if (typeof cachePath !== "string" || !cachePath.trim()) {
    throw new TypeError("cachePath must be a non-empty string.");
  }
  if (typeof model !== "string" || !model.trim()) {
    throw new TypeError("model must be a non-empty string.");
  }
  if (typeof embedText !== "function") {
    throw new TypeError("embedText must be a function.");
  }

  let entries = new Map();
  let dimensions = null;
  let loaded = false;
  let loading;
  let writeQueue = Promise.resolve();
  const pendingEmbeddings = new Map();

  const load = async () => {
    if (loaded) {
      return;
    }
    if (!loading) {
      loading = (async () => {
        let contents;
        try {
          contents = await readFile(cachePath, "utf8");
        } catch (error) {
          if (error.code === "ENOENT") {
            loaded = true;
            return;
          }
          throw error;
        }

        let cache;
        try {
          cache = JSON.parse(contents);
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new Error(`Embedding cache contains invalid JSON: ${cachePath}`, { cause: error });
          }
          throw error;
        }
        validateCache(cache, cachePath);
        if (cache.model === model) {
          entries = new Map(cache.entries.map((entry) => [entry.chunkId, entry]));
          dimensions = cache.entries[0]?.embedding.length ?? null;
        }
        loaded = true;
      })();
    }
    await loading;
  };

  const persist = () => {
    writeQueue = writeQueue.then(async () => {
      const directory = dirname(cachePath);
      await mkdir(directory, { recursive: true });
      const temporaryPath = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporaryPath, JSON.stringify({
          version: CACHE_VERSION,
          model,
          entries: [...entries.values()],
        }), "utf8");
        await rename(temporaryPath, cachePath);
      } finally {
        await rm(temporaryPath, { force: true });
      }
    });
    return writeQueue;
  };

  const getEmbedding = async ({ chunkId, text } = {}) => {
    if (typeof chunkId !== "string" || !chunkId.trim()) {
      throw new TypeError("chunkId must be a non-empty string.");
    }
    if (typeof text !== "string" || !text.trim()) {
      throw new TypeError("text must be a non-empty string.");
    }

    await load();
    const textHash = hashText(text);
    const cached = entries.get(chunkId);
    if (cached?.textHash === textHash) {
      return [...cached.embedding];
    }

    const pendingKey = `${chunkId}:${textHash}`;
    if (pendingEmbeddings.has(pendingKey)) {
      return [...await pendingEmbeddings.get(pendingKey)];
    }

    const pending = (async () => {
      const embedding = await embedText(text, { model });
      validateEmbedding(embedding, "generated embedding");
      if (dimensions !== null && embedding.length !== dimensions) {
        throw new RangeError(
          `Generated embedding has ${embedding.length} dimensions; expected ${dimensions}.`,
        );
      }
      dimensions ??= embedding.length;
      entries.set(chunkId, { chunkId, textHash, embedding: [...embedding] });
      await persist();
      return embedding;
    })();
    pendingEmbeddings.set(pendingKey, pending);
    try {
      return [...await pending];
    } finally {
      pendingEmbeddings.delete(pendingKey);
    }
  };

  return { getEmbedding };
}
