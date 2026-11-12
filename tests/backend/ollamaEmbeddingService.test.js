import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateEmbedding,
  OllamaEmbeddingError,
} from "../../server/services/ollamaEmbeddingService.js";

test("requests an embedding from the configured Ollama endpoint and model", async () => {
  let request;
  const embedding = [0.1, -0.2, 0.3];
  const result = await generateEmbedding("Password reset instructions", {
    ollamaBaseUrl: "http://ollama.test/",
    model: "test-embedding-model",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return Response.json({ embeddings: [embedding] });
    },
  });

  assert.deepEqual(result, embedding);
  assert.equal(request.url, "http://ollama.test/api/embed");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(request.options.body), {
    model: "test-embedding-model",
    input: "Password reset instructions",
  });
  assert.ok(request.options.signal instanceof AbortSignal);
});

test("uses the default Ollama embedding model", async () => {
  let requestBody;
  await generateEmbedding("test text", {
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return Response.json({ embeddings: [[0.1, 0.2]] });
    },
  });

  assert.equal(requestBody.model, "nomic-embed-text");
});

test("rejects empty or non-string input without making a request", async () => {
  let fetchCalled = false;
  const fetchImpl = async () => {
    fetchCalled = true;
    return Response.json({ embeddings: [[0.1]] });
  };

  await assert.rejects(generateEmbedding("", { fetchImpl }), {
    name: "TypeError",
    message: "text must be a non-empty string.",
  });
  await assert.rejects(generateEmbedding("  ", { fetchImpl }), {
    name: "TypeError",
    message: "text must be a non-empty string.",
  });
  await assert.rejects(generateEmbedding(123, { fetchImpl }), {
    name: "TypeError",
    message: "text must be a non-empty string.",
  });
  assert.equal(fetchCalled, false);
});

test("reports HTTP errors with their status code", async () => {
  await assert.rejects(
    generateEmbedding("text", {
      fetchImpl: async () => new Response("model unavailable", { status: 404 }),
    }),
    (error) => {
      assert.ok(error instanceof OllamaEmbeddingError);
      assert.equal(error.status, 404);
      assert.match(error.message, /HTTP 404/);
      return true;
    },
  );
});

test("rejects missing, empty, or malformed embedding data", async (t) => {
  const cases = [
    ["missing embeddings", {}, /missing embeddings/],
    ["empty embeddings list", { embeddings: [] }, /missing embeddings/],
    ["missing vector", { embeddings: [null] }, /exactly one embedding vector/],
    ["multiple vectors", { embeddings: [[0.1], [0.2]] }, /exactly one embedding vector/],
    ["empty vector", { embeddings: [[]] }, /empty embedding vector/],
  ];

  for (const [name, payload, expectedMessage] of cases) {
    await t.test(name, async () => {
      await assert.rejects(
        generateEmbedding("text", {
          fetchImpl: async () => Response.json(payload),
        }),
        (error) => {
          assert.ok(error instanceof OllamaEmbeddingError);
          assert.match(error.message, expectedMessage);
          return true;
        },
      );
    });
  }
});

test("rejects non-finite and non-numeric embedding values", async (t) => {
  for (const [name, embedding] of [
    ["NaN", [Number.NaN]],
    ["positive infinity", [Number.POSITIVE_INFINITY]],
    ["negative infinity", [Number.NEGATIVE_INFINITY]],
    ["string value", ["0.1"]],
  ]) {
    await t.test(name, async () => {
      await assert.rejects(
        generateEmbedding("text", {
          fetchImpl: async () => Response.json({ embeddings: [embedding] }),
        }),
        /finite numbers/,
      );
    });
  }
});

test("rejects an embedding whose dimensions differ from the expected dimensions", async () => {
  await assert.rejects(
    generateEmbedding("text", {
      expectedDimensions: 3,
      fetchImpl: async () => Response.json({ embeddings: [[0.1, 0.2]] }),
    }),
    /2 dimensions; expected 3/,
  );
});

test("reports invalid JSON responses", async () => {
  await assert.rejects(
    generateEmbedding("text", {
      fetchImpl: async () => new Response("{invalid", { status: 200 }),
    }),
    /invalid JSON/,
  );
});

test("wraps network failures with a clear Ollama connection error", async () => {
  const networkError = new TypeError("connection refused");
  await assert.rejects(
    generateEmbedding("text", {
      fetchImpl: async () => {
        throw networkError;
      },
    }),
    (error) => {
      assert.ok(error instanceof OllamaEmbeddingError);
      assert.match(error.message, /Could not reach the Ollama embedding service/);
      assert.equal(error.cause, networkError);
      return true;
    },
  );
});

test("reports timed out requests clearly", async () => {
  const timeoutError = new DOMException("request timed out", "TimeoutError");
  await assert.rejects(
    generateEmbedding("text", {
      timeoutMs: 125,
      fetchImpl: async () => {
        throw timeoutError;
      },
    }),
    (error) => {
      assert.ok(error instanceof OllamaEmbeddingError);
      assert.match(error.message, /timed out after 125 ms/);
      assert.equal(error.cause, timeoutError);
      return true;
    },
  );
});

test("rejects invalid dimension and timeout configuration", async () => {
  await assert.rejects(
    generateEmbedding("text", { expectedDimensions: 0 }),
    /expectedDimensions must be a positive integer/,
  );
  await assert.rejects(
    generateEmbedding("text", { timeoutMs: 0 }),
    /timeoutMs must be a positive integer/,
  );
});
