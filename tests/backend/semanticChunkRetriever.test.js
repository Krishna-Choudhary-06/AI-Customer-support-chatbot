import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cosineSimilarity,
  retrieveSemanticChunks,
} from "../../server/services/semanticChunkRetriever.js";

const queryEmbedding = [1, 0];
const chunks = [
  {
    chunkId: "password-reset",
    documentId: "DOC-ACCOUNT",
    title: "Password reset",
    status: "approved",
    chunkIndex: 0,
    text: "Select Forgot Password to reset the account password.",
    embedding: [0.8, 0.6],
  },
  {
    chunkId: "shipping",
    documentId: "DOC-SHIPPING",
    title: "Shipping",
    status: "approved",
    chunkIndex: 0,
    text: "Track the package using its tracking record.",
    embedding: [0, 1],
  },
];

test("calculates cosine similarity for normalized and non-normalized vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [10, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([1, 0], [-4, 0]), -1);
});

test("ranks approved chunks by cosine similarity and omits embedding vectors", () => {
  const results = retrieveSemanticChunks(queryEmbedding, chunks, {
    minimumSimilarity: 0.5,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].chunkId, "password-reset");
  assert.equal(results[0].retrieval.method, "cosine-similarity");
  assert.equal(results[0].retrieval.score, 0.8);
  assert.equal("embedding" in results[0], false);
});

test("returns no result when all similarities are below the required threshold", () => {
  assert.deepEqual(
    retrieveSemanticChunks(queryEmbedding, chunks, { minimumSimilarity: 0.81 }),
    [],
  );
});

test("filters unapproved, placeholder-bearing, and metadata-mismatched chunks", () => {
  const filteredChunks = [
    { ...chunks[0], chunkId: "draft", status: "draft" },
    { ...chunks[0], chunkId: "placeholder", text: "Unknown: [COMPANY INPUT REQUIRED]" },
    { ...chunks[0], chunkId: "wrong-business", business: "Other Shop" },
    { ...chunks[0], chunkId: "right-business", business: "ShopEase" },
  ];

  const results = retrieveSemanticChunks(queryEmbedding, filteredChunks, {
    minimumSimilarity: 0.5,
    filters: { business: "ShopEase" },
  });

  assert.deepEqual(results.map((result) => result.chunkId), ["right-business"]);
});

test("ranks tied results deterministically and respects the result limit", () => {
  const sameScoreChunks = [
    { ...chunks[0], documentId: "DOC-B", chunkId: "b" },
    { ...chunks[0], documentId: "DOC-A", chunkId: "a" },
    { ...chunks[0], documentId: "DOC-A", chunkId: "a-later", chunkIndex: 1 },
  ];

  const results = retrieveSemanticChunks(queryEmbedding, sameScoreChunks, {
    minimumSimilarity: 0.5,
    limit: 2,
  });

  assert.deepEqual(results.map((result) => result.chunkId), ["a", "a-later"]);
});

test("rejects malformed or dimensionally inconsistent vectors", () => {
  assert.throws(() => cosineSimilarity([], [1]), /non-empty array/);
  assert.throws(() => cosineSimilarity([Number.NaN], [1]), /finite numbers/);
  assert.throws(() => cosineSimilarity([1, 0], [1]), /dimensions do not match/);
  assert.throws(() => cosineSimilarity([0, 0], [1, 0]), /zero-magnitude/);
  assert.throws(
    () => retrieveSemanticChunks(queryEmbedding, [{ ...chunks[0], embedding: [1] }], {
      minimumSimilarity: 0,
    }),
    /dimensions do not match/,
  );
});

test("requires a configured similarity threshold and validates retrieval options", () => {
  assert.throws(
    () => retrieveSemanticChunks(queryEmbedding, chunks),
    /minimumSimilarity must be a finite number/,
  );
  assert.throws(
    () => retrieveSemanticChunks(queryEmbedding, chunks, { minimumSimilarity: 1.1 }),
    /minimumSimilarity must be a finite number/,
  );
  assert.throws(
    () => retrieveSemanticChunks(queryEmbedding, chunks, { minimumSimilarity: 0, limit: 0 }),
    /limit must be a positive integer/,
  );
});
