# Knowledge Base Validation Report

**Validation date:** 2026-10-30  
**Repository:** ShopEase fictional learning demo  
**Overall status:** Structured learning baseline; **not production-ready**

The inspection milestone reports the files currently discoverable by extension, registry status, metadata, placeholders, and explicit retrieval eligibility. No document is retrieval-eligible unless its own metadata explicitly says `approved` and it contains no unresolved `[COMPANY INPUT REQUIRED]` marker.

## Inventory

| Measure | Count / result |
|---|---:|
| Indexed Markdown knowledge modules | 21 |
| Machine-readable index/profile/intent/FAQ documents | 4 |
| Structured FAQ examples | 7 |
| Intent entries | 27 |
| Detailed troubleshooting runbooks | 4 broad runbook groups; additional case detail requires owner data |
| Decision trees | 3 |
| Confirmed real company policies | 0 — ShopEase is fictional |
| Existing demo policy examples | 3 (return window, refund processing example, shipped cancellation example) |
| Duplicate canonical FAQ questions in `faqs.json` | 0 |
| Claimed company-specific shipping/payment/product facts | 0 |
| Supported knowledge files discovered in the inspection milestone | 38 |
| Unsupported files discovered | 0 |
| Registered files in the current index | 26 |
| Unregistered supported files | 12 |
| Empty supported files | 2 |
| Files eligible for retrieval | 2 — approved only as test fixtures, not as real ShopEase policy |
| Documents ingested in the current repository snapshot | 2 |
| Chunks produced in the current repository snapshot | 2 |

Counts are an inventory snapshot, not an endorsement of completeness. The runbooks and intent taxonomy are design guidance; unresolved placeholders block production use.

The knowledge base includes `test-fixtures/approved/password-reset-test.md` and `test-fixtures/approved/order-tracking-test.md`, explicitly approved only to test the ingestion/retrieval/chat pipeline. These are fictional and not approved as real ShopEase policy. The separate pending-approval password-reset fixture remains excluded. Automated tests also use isolated temporary Markdown, text, and JSON fixtures.

## Validation findings

### Coverage

All requested conceptual areas have an independent module or cross-cutting document: profile, general FAQ, accounts, products, orders, payments, returns/refunds, shipping, offers, technical troubleshooting, complaints, food, vendor, subscriptions, privacy/security, escalation, intents/entities, conversations, decision trees, response templates, glossary, metadata/index.

Food/restaurant and seller/vendor material is explicitly conditional because the stated ShopEase model does not include those operations. No product catalog, live account/order/payment service, physical support channel, or production-ready human handoff is documented.

### Missing company inputs

- Legal entity; business model (marketplace versus single-brand); governing terms and privacy notice.
- Target customer segments, operating countries/regions, languages, accessibility requirements, hours, official web/app URLs, and contact channels.
- Catalogue/SKU details, prices, stock, product specifications, warranty, seller/authenticity sources, recall/safety source.
- Order states, fulfillment owner, delivery regions/charges/estimates/carriers, tracking, address changes, proof of delivery.
- Supported payment methods, currencies, tax/invoice rules, payment provider, reconciliation and refund integration.
- Approved return eligibility, excluded goods, return procedure, evidence, pickup, replacement, cancellation, refund method/timeline/exception rules.
- Coupon/loyalty/subscription availability and terms.
- Identity verification, account recovery, data retention, privacy-rights procedures, security incident contacts.
- Support departments, escalation ownership, human-channel URLs, SLAs, priority rules, case management, closure criteria.
- Document owner, approver, review cadence, effective dates, source citations, localization process.

### Accuracy and risk

- The three supplied policy statements are explicitly marked fictional examples and not approved commitments.
- The previous policy source files remain for compatibility; they should be reviewed against the structured JSON copy before changing either.
- Lexical retrieval can select an irrelevant result when query terms overlap. Human review and retrieval-quality tests are required before launch.
- LLM output must not supply unsupported company claims. Current backend fallback behavior should be validated against each knowledge source before expanding retrieval formats.
- No legal, tax, health, allergen, or emergency advice is included as verified policy.

## Production-readiness checklist

- [ ] Business owner approves company profile and business model.
- [ ] Every customer-facing policy has an accountable owner, source, region, version, effective date, and approval status.
- [ ] Company-input placeholders are resolved or content is intentionally marked not applicable.
- [ ] Support channels, service hours, escalation teams, emergency/security routes, and response SLAs are configured.
- [ ] Product, order, delivery, payment, and refund claims are backed by authoritative systems or approved documents.
- [ ] Privacy/legal review approves collection, retention, deletion, and identity-verification rules.
- [ ] Internal-only material cannot be retrieved by the customer chatbot.
- [ ] Retrieval includes document status, effective date, region, audience, and version filtering.
- [ ] Retrieval tests cover paraphrases, ambiguity, conflicting policies, expired content, no-answer cases, and prompt injection.
- [ ] Model responses are constrained to retrieved, approved facts; no unsupported action/status claim reaches customers.
- [ ] Human handoff is implemented and monitored.
- [ ] Localization, accessibility, incident monitoring, and rollback are tested.

## Required approvals

The business owner must approve all policy values before public use. The security/privacy and legal owners must approve sensitive workflows. Operations must own escalation routing and service targets.
