# ShopEase Customer Support Knowledge Base

> ShopEase is a fictional learning demo. This repository is a structured knowledge-design baseline, not an approved policy library for a real company.

## How to use this repository

1. Start with [the company profile](./00_company_profile/company-profile.md) and resolve unknown business facts.
2. Read the module that owns the customer's issue; use the [intent taxonomy](./16_intent_taxonomy/intent-taxonomy.md) for routing.
3. Treat material marked `[COMPANY INPUT REQUIRED]` as unknown. Do not answer it with model knowledge.
4. Treat the seven FAQ JSON entries and current plain-text Q/A examples as fictional examples requiring owner approval.
5. Use [the metadata index](./21_metadata_and_index/knowledge-index.json) to locate documents and [the validation report](./21_metadata_and_index/validation-report.md) to track gaps.
6. Before production, approve policies, set effective dates, and connect trusted account/order/payment/handoff systems.

## Module map

| Folder | Responsibility |
|---|---|
| `00_company_profile/` | Business scope, configurable company profile, unknowns |
| `01_general_faqs/` | Company information and initial general FAQ answers |
| `02_account_management/` | Registration, access, profile and security-safe handling |
| `03_products_services/` | Catalogue facts, specifications and product support |
| `04_order_management/` | Order lifecycle and exception triage |
| `05_payments_billing/` | Payment, billing, invoice and reconciliation support |
| `06_returns_refunds/` | Return, replacement, refund and cancellation rules |
| `07_shipping_delivery/` | Shipping, tracking and logistics exceptions |
| `08_discounts_loyalty/` | Offers, coupons and loyalty program template |
| `09_technical_troubleshooting/` | Web, app, network and integration troubleshooting |
| `10_complaints_disputes/` | Complaint intake, severity and ownership |
| `11_food_restaurant/` | Conditional food-service and safety module |
| `12_seller_vendor/` | Internal partner support; not customer-facing |
| `13_subscriptions/` | Conditional membership/subscription module |
| `14_privacy_security/` | Privacy, account security and fraud-safe response |
| `15_escalation_human_support/` | L0-L4 handoff framework |
| `16_intent_taxonomy/` | Intent definitions, entities and machine-readable taxonomy |
| `17_conversation_examples/` | Multi-turn and edge-case test scenarios |
| `18_business_rules/` | Refund, return and delivery decision trees |
| `19_response_templates/` | Voice and response templates |
| `20_glossary/` | Shared support terminology |
| `21_metadata_and_index/` | Index, FAQ JSON, schema, document template and QA report |

## Formats and retrieval readiness

Markdown is the human-reviewed source format; JSON files provide structured profile, FAQ, intent, index, and metadata examples. The chat API now tries retrieval over approved ingested chunks first and returns source metadata for a matching chunk. If there are no eligible matching chunks, it falls back to the legacy structured FAQ JSON and Q/A text retrieval to preserve the existing demo. The current ShopEase repository has no approved chunk sources, so live chat currently uses that legacy FAQ path. Persistent indexing, embeddings, metadata filtering by region/audience/effective date, freshness handling, and full semantic RAG remain future implementation work.

The knowledge base is **not production-ready**. See [validation-report.md](./21_metadata_and_index/validation-report.md) for missing inputs and readiness checks.

Run the structural checks from the repository root:

```powershell
node scripts/validate-knowledge-base.mjs
```

Inspect supported source files and their metadata/eligibility without indexing their contents:

```powershell
cd server
npm run knowledge:inspect
```

The inspector supports `.md`, `.txt`, and `.json` files. It reports registered/unregistered files, business and industry metadata, empty/incomplete content, unresolved placeholders, approval status, and retrieval eligibility. Eligibility requires an explicit document-level `status: approved` and no unresolved company-input placeholder.

Extract and chunk eligible documents without writing a persistent index:

```powershell
cd server
npm run knowledge:ingest
```

Ingestion removes Markdown metadata tables, extracts readable content from JSON, preserves heading context, and creates chunks no larger than 1000 characters with source, document, business, industry, intent, version, status, and chunk-order metadata. Only approved, supported, non-empty documents without unresolved placeholders are processed. The command returns a JSON report and chunk list; it does not persist vectors, generate embeddings, or change chat retrieval.

Search the current eligible chunks using local keyword overlap:

```powershell
npm run knowledge:search -- "I forgot my password"
```

Retrieval normalizes common terms, scores query-term coverage, can apply business/industry/region/intent metadata filters, and returns source-attributed chunks. A result is evidence for review, not an automatically generated or verified response. No vector database or embedding model is used.

Evaluate the separate semantic retriever with the local Ollama `nomic-embed-text` model:

```powershell
cd server
npm run semantic:evaluate
```

The evaluation embeds the approved test-fixture chunk and labeled exact, paraphrase, misleading-overlap, and unsupported queries from `tests/fixtures/semantic-retrieval-evaluation.json`. It reports cosine scores and correctness at candidate thresholds; it does not select or persist a threshold, store embeddings, or change chat retrieval. Ollama must be running with the embedding model available. The small test-only dataset is diagnostic and is not sufficient by itself to establish a production threshold.

To opt the chat API into semantic retrieval for a local comparison, set these values in `server/.env` and restart the server:

```dotenv
RETRIEVAL_MODE=semantic
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
SEMANTIC_MINIMUM_SIMILARITY=0.45
```

`keyword` remains the default. In semantic mode, approved chunk embeddings are cached locally in `server/.cache/semantic-embeddings.json`; query embeddings are generated per request and not cached. Cache entries are keyed by chunk ID and a SHA-256 hash of the chunk text, and the cache is tied to the configured embedding model. Changed chunk text or model settings cause embeddings to be regenerated. The local cache is ignored by Git; set `SEMANTIC_EMBEDDING_CACHE_PATH` to choose another path. The current `0.5` threshold correctly classified six of seven small labeled test cases, including the password and order-tracking paraphrases and the warehouse-roof negative. One deliberately confusing negative query still retrieved a chunk, so this is not a production-validated threshold. A successful response shows its source in the chat UI as a **Semantic match** with its similarity score. If Ollama embeddings are unavailable, the API reports an error instead of silently switching retrieval modes. If semantic retrieval abstains, the existing FAQ and no-evidence fallback path remains in effect.

The knowledge base includes explicitly approved **test-only** fixtures for password reset and order tracking under `test-fixtures/approved/` so you can exercise positive retrieval across multiple topics. This approval is limited to pipeline testing and is not approval of real ShopEase policy. The pending-approval fixture under `22_test_fixtures/` remains unchanged and excluded. Inspection should report two eligible test documents, and ingestion should produce their chunks. Test their topics with `How can I reset my ShopEase test account password?` and `Where can I see the latest progress of my delivery?`; answers must retain the test-only warning and include the relevant fixture source. With the current semantic threshold, `What color is the ShopEase warehouse roof?` should abstain; however, the evaluation set has one other overlapping unsupported query that still retrieves a result. Tests also use isolated temporary fixtures for extraction, chunking, retrieval, and chat behavior.
