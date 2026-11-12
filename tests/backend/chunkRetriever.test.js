import assert from "node:assert/strict";
import { test } from "node:test";
import { retrieveRelevantChunks } from "../../server/services/chunkRetriever.js";

const chunks = [
  {
    chunkId: "account-1",
    documentId: "SHO-ACC-001",
    title: "Account support",
    module: "Account",
    intent: "password_reset",
    status: "approved",
    chunkIndex: 0,
    text: "To reset a forgotten password, visit the login page and select Forgot Password.",
    source: "account.md",
  },
  {
    chunkId: "shipping-1",
    documentId: "SHO-SHIP-001",
    title: "Shipping support",
    module: "Shipping",
    intent: "order_tracking",
    status: "approved",
    chunkIndex: 0,
    text: "Track an order using the verified tracking record in the order history.",
    source: "shipping.md",
  },
];

test("retrieves a relevant approved chunk for a paraphrased question and returns source metadata", () => {
  const results = retrieveRelevantChunks("I forgot how to recover my password", chunks);

  assert.equal(results.length, 1);
  assert.equal(results[0].chunkId, "account-1");
  assert.equal(results[0].source, "account.md");
  assert.equal(results[0].retrieval.method, "keyword-overlap");
  assert.ok(results[0].retrieval.score >= 0.4);
  assert.ok(results[0].retrieval.matchedTerms.includes("reset"));
});

test("returns no result for unsupported questions", () => {
  const results = retrieveRelevantChunks("What color is the ShopEase warehouse roof?", chunks);
  assert.deepEqual(results, []);
});

test("does not treat business-name overlap as evidence for an unrelated question", () => {
  const brandedChunk = {
    ...chunks[0],
    business: "Example Shop",
    text: "To reset a forgotten password, visit the Example Shop login page and select Forgot Password.",
  };

  const results = retrieveRelevantChunks(
    "What color is the Example Shop warehouse roof?",
    [brandedChunk],
  );

  assert.deepEqual(results, []);
});

test("never returns unapproved chunks or text containing unresolved company placeholders", () => {
  const unsafeChunks = [
    { ...chunks[0], chunkId: "draft", status: "draft" },
    { ...chunks[0], chunkId: "placeholder", text: "Password reset uses [COMPANY INPUT REQUIRED]." },
  ];

  assert.deepEqual(
    retrieveRelevantChunks("How can I reset a password?", unsafeChunks),
    [],
  );
});

test("supports business, industry, and intent metadata filters", () => {
  const scopedChunks = [
    { ...chunks[0], business: "ShopEase", industry: "E-commerce" },
    { ...chunks[1], business: "ShopEase", industry: "E-commerce" },
    { ...chunks[1], chunkId: "other-store-shipping", business: "OtherStore", industry: "Retail" },
  ];

  const results = retrieveRelevantChunks("How do I track my order?", scopedChunks, {
    filters: { business: "ShopEase", industry: "E-commerce", intent: "order_tracking" },
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].chunkId, "shipping-1");

  const excludedByBusiness = retrieveRelevantChunks("How do I track my order?", scopedChunks, {
    filters: { business: "OtherStore" },
  });
  assert.equal(excludedByBusiness.length, 1);
  assert.equal(excludedByBusiness[0].chunkId, "other-store-shipping");
});

test("returns the best-ranked results up to the requested limit", () => {
  const duplicateMatch = {
    ...chunks[0],
    chunkId: "account-2",
    documentId: "SHO-ACC-002",
    chunkIndex: 1,
  };
  const results = retrieveRelevantChunks(
    "I forgot my password reset",
    [...chunks, duplicateMatch],
    { limit: 1 },
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].chunkId, "account-1");
});

test("rejects invalid retrieval options", () => {
  assert.throws(() => retrieveRelevantChunks("reset password", chunks, { limit: 0 }), /limit/);
  assert.throws(
    () => retrieveRelevantChunks("reset password", chunks, { minimumQueryCoverage: 2 }),
    /minimumQueryCoverage/,
  );
  assert.throws(() => retrieveRelevantChunks("", "not chunks"), /chunks must be an array/);
});
