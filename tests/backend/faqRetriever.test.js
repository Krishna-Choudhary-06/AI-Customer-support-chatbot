import assert from "node:assert/strict";
import { test } from "node:test";
import { retrieveRelevantFaqs } from "../../server/services/faqRetriever.js";

const entries = [
  {
    id: "password-reset",
    question: "How do I reset my password?",
    answer: "Visit the login page and select Forgot Password.",
  },
];

test("returns no match for an unmatched single-token query", () => {
  assert.deepEqual(retrieveRelevantFaqs("warehouse", entries), []);
});

test("returns a match for a matching single-token query", () => {
  assert.deepEqual(retrieveRelevantFaqs("password", entries), [entries[0]]);
});

test("returns no match when the query contains only stop words", () => {
  assert.deepEqual(retrieveRelevantFaqs("how do I", entries), []);
});
