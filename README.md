# AI-Powered Customer Support Platform

## Smart chat client

The repository currently contains a React chat client, a Node.js chat API, lexical retrieval over approved document chunks, and a legacy FAQ fallback. Authentication, conversation persistence, ticket workflows, embeddings, and the separate Python AI service are not implemented yet.

### Run the client

Prerequisite: Node.js 22.12+.

```powershell
cd client
npm install
npm run dev
```

### Run the API and local AI model

The API uses [Ollama](https://ollama.com/) to generate replies locally, so it does not require a paid model API key. Install and start Ollama, then download the default model:

```powershell
ollama pull qwen2.5:3b
```

In another terminal:

```powershell
cd server
npm run start
```

Run the client in a separate terminal with `cd client; npm run dev`. Vite forwards `/api` requests to the local API at `http://127.0.0.1:3001`. To select another model or Ollama host, copy `server/.env.example` to `server/.env` and update `OLLAMA_MODEL` or `OLLAMA_BASE_URL`.

### Chat API contract

The server accepts `POST /api/chat` with a JSON body:

```json
{ "message": "How can I reset my password?" }
```

It returns JSON containing a non-empty `reply` string:

```json
{
  "reply": "Use the password reset link on the sign-in page.",
  "sources": [
    {
      "documentId": "SHO-ACC-001",
      "title": "Account support",
      "source": "02_account_management/account-management.md",
      "sourceReference": "approved policy source",
      "chunkId": "SHO-ACC-001:chunk:1:..."
    }
  ]
}
```

The API first ingests approved document chunks and searches them using keyword overlap. A matched chunk is sent to Ollama with source metadata; the server accepts only an exact chunk match and otherwise returns the retrieved chunk verbatim with source metadata. If no approved chunk matches, it falls back to structured FAQ records in `knowledge-base/21_metadata_and_index/faqs.json`, then the legacy Q/A text format if the JSON is unavailable. FAQ answers use an exact-answer check too. If neither retrieval path has evidence, the API returns a fixed "not enough information" response without asking the model to guess. If Ollama is not running or the configured model is not installed, the API returns an error rather than a fabricated reply.

The current knowledge base contains seven clearly fictional ShopEase demo entries: four general FAQs and three return/refund policy examples. See the [knowledge-base guide](./knowledge-base/README.md) for the modular documentation, company-input gaps, and validation status. The product, shipping, and troubleshooting text files do not yet contain verified demo entries; the chatbot should report insufficient information for those topics.

The expanded knowledge system is organized into 21 indexed modules under [`knowledge-base/`](./knowledge-base/). Its Markdown documents are for human review; structured FAQ and intent data are available as JSON. Module guidance and unapproved placeholders are not all ingested by the chatbot. Check knowledge-base structure with:

```powershell
node scripts/validate-knowledge-base.mjs
```

Inspect document metadata with `cd server; npm run knowledge:inspect`, extract and chunk explicitly approved sources with `cd server; npm run knowledge:ingest`, or test lexical retrieval with `cd server; npm run knowledge:search -- "your question"`. Chat tries approved chunk retrieval first and preserves legacy FAQ fallback. Ingestion is performed per request; embeddings and persistent indexing have not been implemented.

### FAQ retrieval flow

```text
Customer question
        ↓
POST /api/chat validates the message
        ↓
Inspect, extract, and chunk explicitly approved documents
        ↓
Keyword retrieval over eligible chunks
        ├── Matching chunk → Ollama + context → exact-match guard → reply + source
        └── No matching chunk → legacy FAQ retrieval → grounded reply
                                  └── No FAQ match → fixed insufficient-information response
```

This is a local lexical retrieval baseline, not semantic search. It does not use embeddings, a vector database, or conversation history. Ingestion runs per request and does not persist an index. The current repository has no approved chunk sources, so chat currently uses the legacy FAQ path. Keyword matching can still select an irrelevant result; review retrieval before using this demo for real customer support.

Knowledge-base text files use this format:

```text
COMPANY: ShopEase (fictional demo business)
CATEGORY: General FAQs

Q1: How do I create an account?

A: Visit the registration page and follow the sign-up steps.
```

### Current chat behavior

- Messages are shown in submission/response order with local timestamps.
- Blank or whitespace-only submissions are ignored.
- The UI displays a loading indicator and offers a retry after a request failure.
- The layout adapts to narrow screens.

Build the client with `npm run build` from `client`. Run the API and retrieval tests with `npm test` from `server`; tests mock the Ollama service and do not require a downloaded model.