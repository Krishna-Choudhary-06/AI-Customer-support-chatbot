const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "can", "did", "do", "does", "for", "from",
  "how", "i", "in", "is", "it", "me", "my", "of", "on", "the", "to", "was",
  "what", "when", "where", "which", "who", "why", "with", "you", "your",
]);
const TERM_ALIASES = new Map([
  ["assistance", "support"],
  ["cancelled", "cancel"],
  ["cancellation", "cancel"],
  ["cancellations", "cancel"],
  ["contact", "contact"],
  ["forgot", "reset"],
  ["help", "support"],
  ["packages", "package"],
  ["reach", "contact"],
  ["recover", "reset"],
  ["refunds", "refund"],
  ["refunded", "refund"],
  ["registration", "register"],
  ["returns", "return"],
  ["shipping", "ship"],
  ["signup", "register"],
  ["talk", "contact"],
  ["track", "track"],
  ["tracked", "track"],
  ["tracking", "track"],
  ["update", "change"],
]);
const DEFAULT_MINIMUM_QUERY_COVERAGE = 0.4;
const DEFAULT_RESULT_LIMIT = 5;
const UNRESOLVED_PLACEHOLDER = /\[COMPANY INPUT REQUIRED\]/i;

function normalizeTerms(value) {
  return value
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.map((term) => TERM_ALIASES.get(term) || term)
    .filter((term) => !STOP_WORDS.has(term)) ?? [];
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

export function retrieveRelevantChunks(query, chunks, {
  limit = DEFAULT_RESULT_LIMIT,
  minimumQueryCoverage = DEFAULT_MINIMUM_QUERY_COVERAGE,
  filters = {},
} = {}) {
  if (typeof query !== "string") {
    throw new TypeError("query must be a string.");
  }
  if (!Array.isArray(chunks)) {
    throw new TypeError("chunks must be an array.");
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer.");
  }
  if (
    typeof minimumQueryCoverage !== "number"
    || minimumQueryCoverage <= 0
    || minimumQueryCoverage > 1
  ) {
    throw new RangeError("minimumQueryCoverage must be greater than 0 and at most 1.");
  }
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("filters must be an object.");
  }

  const queryTerms = new Set(normalizeTerms(query));
  if (queryTerms.size === 0) {
    return [];
  }

  return chunks
    .flatMap((chunk) => {
      if (
        chunk.status?.toLowerCase() !== "approved"
        || typeof chunk.text !== "string"
        || !chunk.text.trim()
        || UNRESOLVED_PLACEHOLDER.test(chunk.text)
        || !matchesFilters(chunk, filters)
      ) {
        return [];
      }

      const searchableText = [
        chunk.title,
        chunk.module,
        chunk.submodule,
        chunk.intent,
        chunk.text,
      ].filter((value) => typeof value === "string").join(" ");
      const chunkTerms = new Set(normalizeTerms(searchableText));
      const businessTerms = new Set(normalizeTerms(chunk.business ?? ""));
      const relevantQueryTerms = [...queryTerms].filter((term) => !businessTerms.has(term));
      if (relevantQueryTerms.length === 0) {
        return [];
      }

      const matchedTerms = relevantQueryTerms.filter((term) => chunkTerms.has(term));
      const coverage = matchedTerms.length / relevantQueryTerms.length;
      const hasEnoughEvidence =
        matchedTerms.length >= 2
        || (relevantQueryTerms.length === 1 && matchedTerms[0].length >= 4);

      if (!hasEnoughEvidence || coverage < minimumQueryCoverage) {
        return [];
      }

      return [{
        chunk,
        score: coverage,
        matchedTerms,
        queryTermCount: relevantQueryTerms.length,
      }];
    })
    .sort((left, right) =>
      right.score - left.score
      || right.matchedTerms.length - left.matchedTerms.length
      || left.chunk.documentId.localeCompare(right.chunk.documentId)
      || left.chunk.chunkIndex - right.chunk.chunkIndex,
    )
    .slice(0, limit)
    .map(({ chunk, score, matchedTerms, queryTermCount }) => ({
      ...chunk,
      retrieval: {
        method: "keyword-overlap",
        score,
        matchedTerms,
        queryTermCount,
      },
    }));
}
