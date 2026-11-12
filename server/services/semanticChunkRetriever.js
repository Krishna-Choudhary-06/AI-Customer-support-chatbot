const DEFAULT_RESULT_LIMIT = 5;
const UNRESOLVED_PLACEHOLDER = /\[COMPANY INPUT REQUIRED\]/i;

function validateVector(vector, label) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new TypeError(`${label} must be a non-empty array.`);
  }
  if (!vector.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new TypeError(`${label} must contain only finite numbers.`);
  }
}

function matchesFilters(chunk, filters) {
  return Object.entries(filters).every(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return true;
    }
    return typeof chunk[key] === "string"
      && chunk[key].toLowerCase() === String(value).toLowerCase();
  });
}

export function cosineSimilarity(left, right) {
  validateVector(left, "left vector");
  validateVector(right, "right vector");
  if (left.length !== right.length) {
    throw new RangeError(
      `Embedding dimensions do not match: ${left.length} and ${right.length}.`,
    );
  }

  let dotProduct = 0;
  let leftMagnitudeSquared = 0;
  let rightMagnitudeSquared = 0;
  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitudeSquared += left[index] ** 2;
    rightMagnitudeSquared += right[index] ** 2;
  }

  if (leftMagnitudeSquared === 0 || rightMagnitudeSquared === 0) {
    throw new RangeError("Cosine similarity is undefined for a zero-magnitude vector.");
  }

  return dotProduct / (Math.sqrt(leftMagnitudeSquared) * Math.sqrt(rightMagnitudeSquared));
}

export function retrieveSemanticChunks(queryEmbedding, chunks, {
  minimumSimilarity,
  limit = DEFAULT_RESULT_LIMIT,
  filters = {},
} = {}) {
  validateVector(queryEmbedding, "query embedding");
  if (!Array.isArray(chunks)) {
    throw new TypeError("chunks must be an array.");
  }
  if (
    typeof minimumSimilarity !== "number"
    || !Number.isFinite(minimumSimilarity)
    || minimumSimilarity < -1
    || minimumSimilarity > 1
  ) {
    throw new RangeError("minimumSimilarity must be a finite number between -1 and 1.");
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer.");
  }
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("filters must be an object.");
  }

  return chunks
    .flatMap((chunk) => {
      if (
        typeof chunk.status !== "string"
        || chunk.status.toLowerCase() !== "approved"
        || typeof chunk.text !== "string"
        || !chunk.text.trim()
        || UNRESOLVED_PLACEHOLDER.test(chunk.text)
        || !matchesFilters(chunk, filters)
      ) {
        return [];
      }

      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (score < minimumSimilarity) {
        return [];
      }
      const { embedding, ...metadata } = chunk;
      return [{ ...metadata, score }];
    })
    .sort((left, right) =>
      right.score - left.score
      || left.documentId.localeCompare(right.documentId)
      || left.chunkIndex - right.chunkIndex,
    )
    .slice(0, limit)
    .map(({ score, ...chunk }) => ({
      ...chunk,
      retrieval: {
        method: "cosine-similarity",
        score,
      },
    }));
}
