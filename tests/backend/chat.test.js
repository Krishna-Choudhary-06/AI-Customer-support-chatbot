import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { createServer } from "../../server/server.js";

let server;
let baseUrl;
let receivedOllamaRequest;
const temporaryDirectories = [];

async function createFaqKnowledgeBase() {
  const root = await mkdtemp(join(tmpdir(), "shopease-chat-faq-kb-"));
  temporaryDirectories.push(root);
  const faqDirectory = join(root, "21_metadata_and_index");
  await mkdir(faqDirectory, { recursive: true });
  const faqContents = await readFile(
    new URL("../../knowledge-base/21_metadata_and_index/faqs.json", import.meta.url),
    "utf8",
  );
  await writeFile(join(faqDirectory, "faqs.json"), faqContents);
  return root;
}

async function createApprovedKnowledgeBase() {
  const root = await mkdtemp(join(tmpdir(), "shopease-chat-kb-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "docs", "password.md"), [
    "# Password recovery",
    "",
    "## Document metadata",
    "| Document ID | SHO-ACC-TEST |",
    "| Document Title | Password recovery |",
    "| Module | Account management |",
    "| Business | ShopEase |",
    "| Document Type | procedure |",
    "| Intent | password_reset |",
    "| Version | 1.0 |",
    "| Status | approved |",
    "| Source | approved test fixture |",
    "",
    "To reset a forgotten password, visit the login page and select Forgot Password.",
  ].join("\n"));
  return root;
}

async function createEmbeddingCachePath() {
  const root = await mkdtemp(join(tmpdir(), "shopease-chat-embedding-cache-"));
  temporaryDirectories.push(root);
  return join(root, "semantic-embeddings.json");
}

beforeEach(async () => {
  receivedOllamaRequest = null;
  const knowledgeBasePath = await createFaqKnowledgeBase();
  server = createServer({
    knowledgeBasePath,
    embeddingCachePath: await createEmbeddingCachePath(),
    ollamaBaseUrl: "http://ollama.test",
    ollamaModel: "test-model",
    fetchImpl: async (url, options) => {
      receivedOllamaRequest = { url, options };
      return Response.json({
        message: { content: "Visit the login page and select the Forgot Password option." },
      });
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true }),
  ));
});

test("POST /api/chat grounds an answer in a relevant ShopEase FAQ", async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "  I forgot my password. How can I reset it?  " }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: "Visit the login page and select the Forgot Password option.",
  });
  assert.equal(receivedOllamaRequest.url, "http://ollama.test/api/chat");
  const ollamaPayload = JSON.parse(receivedOllamaRequest.options.body);
  assert.deepEqual(ollamaPayload, {
    model: "test-model",
    messages: [
      {
        role: "system",
        content: "You are ShopEase's customer support assistant. Choose the single answer that best answers the customer's question using only the supplied approved ShopEase knowledge context. Return the selected answer exactly as written in the supplied context. Do not add a greeting, explanation, outside knowledge, or any other text.",
      },
      {
        role: "user",
        content: "ShopEase FAQ context:\nSource: 21_metadata_and_index/faqs.json (account)\nQ: How do I reset my password?\nA: Visit the login page and select the Forgot Password option.\n\nCustomer question:\nI forgot my password. How can I reset it?",
      },
    ],
    stream: false,
  });
});

test("POST /api/chat does not return claims invented by Ollama", async () => {
  server.close();
  server = createServer({
    knowledgeBasePath: await createFaqKnowledgeBase(),
    fetchImpl: async () => Response.json({
      message: { content: "Use your registered email or phone and contact Alibaba support." },
    }),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "How do I reset my password?" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: "Visit the login page and select the Forgot Password option.",
  });
});

test("POST /api/chat rejects empty and whitespace-only messages", async () => {
  for (const message of ["", "   "]) {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /non-empty string/);
  }

  assert.equal(receivedOllamaRequest, null);
});

test("POST /api/chat reports a clear error if Ollama is unavailable", async () => {
  server.close();
  server = createServer({
    knowledgeBasePath: await createFaqKnowledgeBase(),
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "How do I reset my password?" }),
  });

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Start Ollama/);
});

test("unsupported questions receive a fixed no-information answer without calling Ollama", async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "What are ShopEase's weekend store hours?" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: "I don't have enough information in ShopEase's current support information to answer that confidently.",
  });
  assert.equal(receivedOllamaRequest, null);
});

test("POST /api/chat uses approved chunks before the legacy FAQ source and returns source metadata", async () => {
  server.close();
  const knowledgeBasePath = await createApprovedKnowledgeBase();
  server = createServer({
    knowledgeBasePath,
    embeddingCachePath: await createEmbeddingCachePath(),
    ollamaBaseUrl: "http://ollama.test",
    ollamaModel: "test-model",
    fetchImpl: async (url, options) => {
      receivedOllamaRequest = { url, options };
      return Response.json({
        message: { content: "The model adds an unsupported password recovery step." },
      });
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "I forgot my password. How can I reset it?" }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(
    payload.reply,
    "Password recovery\nTo reset a forgotten password, visit the login page and select Forgot Password.",
  );
  assert.deepEqual(payload.sources[0], {
    documentId: "SHO-ACC-TEST",
    title: "Password recovery",
    source: "docs/password.md",
    sourceReference: "approved test fixture",
    chunkId: payload.sources[0].chunkId,
    retrieval: {
      method: "keyword-overlap",
      score: 1,
      matchedTerms: ["reset", "password"],
      queryTermCount: 2,
    },
  });
  assert.match(payload.sources[0].chunkId, /^SHO-ACC-TEST:chunk:1:[a-f0-9]{20}$/);

  const ollamaPayload = JSON.parse(receivedOllamaRequest.options.body);
  assert.match(ollamaPayload.messages[0].content, /approved ShopEase knowledge chunks/);
  assert.match(ollamaPayload.messages[1].content, /approved test fixture/);
  assert.match(ollamaPayload.messages[1].content, /Forgot Password/);
});

test("POST /api/chat does not send unrelated or unapproved document chunks to Ollama", async () => {
  server.close();
  const knowledgeBasePath = await createApprovedKnowledgeBase();
  await writeFile(join(knowledgeBasePath, "docs", "draft.md"), [
    "## Document metadata",
    "| Document ID | SHO-DRAFT |",
    "| Document Title | Draft shipping policy |",
    "| Document Type | policy |",
    "| Status | draft |",
    "",
    "Shipping costs 100 units.",
  ].join("\n"));
  server = createServer({
    knowledgeBasePath,
    fetchImpl: async () => {
      receivedOllamaRequest = true;
      return Response.json({ message: { content: "unexpected" } });
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "What are the ShopEase shipping charges?" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: "I don't have enough information in ShopEase's current support information to answer that confidently.",
  });
  assert.equal(receivedOllamaRequest, null);
});

test("POST /api/chat rejects same-business name overlap for an unsupported question", async () => {
  server.close();
  const knowledgeBasePath = await createApprovedKnowledgeBase();
  server = createServer({
    knowledgeBasePath,
    fetchImpl: async () => {
      receivedOllamaRequest = true;
      return Response.json({ message: { content: "unexpected" } });
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "What color is the ShopEase warehouse roof?" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: "I don't have enough information in ShopEase's current support information to answer that confidently.",
  });
  assert.equal(receivedOllamaRequest, null);
});

test("semantic retrieval answers a paraphrased query and returns its similarity source", async () => {
  server.close();
  const knowledgeBasePath = await createApprovedKnowledgeBase();
  const query = "I cannot sign in and need to make a new password for my account.";
  const expectedChunk =
    "Password recovery\nTo reset a forgotten password, visit the login page and select Forgot Password.";
  const embeddingRequests = [];
  let chatRequest;
  server = createServer({
    knowledgeBasePath,
    embeddingCachePath: await createEmbeddingCachePath(),
    ollamaBaseUrl: "http://ollama.test",
    ollamaModel: "test-chat-model",
    retrievalMode: "semantic",
    semanticMinimumSimilarity: 0.45,
    fetchImpl: async (url, options) => {
      if (url.endsWith("/api/embed")) {
        const body = JSON.parse(options.body);
        embeddingRequests.push(body);
        return Response.json({
          embeddings: [body.input === query ? [0.8, 0.6] : [1, 0]],
        });
      }

      chatRequest = { url, payload: JSON.parse(options.body) };
      return Response.json({ message: { content: expectedChunk } });
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: query }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.reply, expectedChunk);
  assert.equal(embeddingRequests.length, 2);
  assert.equal(embeddingRequests[0].model, "nomic-embed-text");
  assert.equal(embeddingRequests[1].input, query);
  assert.equal(chatRequest.url, "http://ollama.test/api/chat");
  assert.equal(payload.sources[0].retrieval.method, "cosine-similarity");
  assert.equal(payload.sources[0].retrieval.score, 0.8);

  const secondResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: query }),
  });
  assert.equal(secondResponse.status, 200);
  assert.equal(embeddingRequests.length, 3);
});

test("semantic retrieval abstains below threshold and preserves the no-evidence fallback", async () => {
  server.close();
  const knowledgeBasePath = await createApprovedKnowledgeBase();
  let chatCalled = false;
  let embeddingCalls = 0;
  server = createServer({
    knowledgeBasePath,
    embeddingCachePath: await createEmbeddingCachePath(),
    retrievalMode: "semantic",
    semanticMinimumSimilarity: 0.45,
    fetchImpl: async (url) => {
      if (url.endsWith("/api/embed")) {
        embeddingCalls += 1;
        return Response.json({
          embeddings: [embeddingCalls === 1 ? [1, 0] : [0.4, Math.sqrt(0.84)]],
        });
      }
      chatCalled = true;
      return Response.json({ message: { content: "unexpected" } });
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "What color is the warehouse roof?" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: "I don't have enough information in ShopEase's current support information to answer that confidently.",
  });
  assert.equal(embeddingCalls, 2);
  assert.equal(chatCalled, false);
});

test("semantic embedding failures return an explicit service error", async () => {
  server.close();
  const knowledgeBasePath = await createApprovedKnowledgeBase();
  let chatCalled = false;
  server = createServer({
    knowledgeBasePath,
    embeddingCachePath: await createEmbeddingCachePath(),
    retrievalMode: "semantic",
    fetchImpl: async (url) => {
      if (url.endsWith("/api/embed")) {
        throw new TypeError("connection refused");
      }
      chatCalled = true;
      return Response.json({ message: { content: "unexpected" } });
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "I cannot sign in and need to make a new password." }),
  });

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Could not reach the Ollama embedding service/);
  assert.equal(chatCalled, false);
});

test("unknown routes return JSON 404 responses", async () => {
  const response = await fetch(`${baseUrl}/api/unknown`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Endpoint not found." });
});
