# Customer Support Intent Taxonomy

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-INTENT-001` |
| Module / submodule | Conversational AI / intent and entities |
| Document type / intent | Machine-readable taxonomy / intent classification |
| Customer segment / region / channel | All / `[COMPANY INPUT REQUIRED]` / chatbot |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Initial taxonomy; account/order actions unavailable / project scope |
| Related documents | `SHO-ORDER-001`, `SHO-PAY-001`, `SHO-RET-001`, `SHO-ESC-001`, `intent-taxonomy.json` |

## Intent routing rules

1. Classify the customer's goal, not only individual keywords.
2. Resolve a request from a current document only if it meets the document's approval and region/version constraints.
3. If multiple intents are present, handle safety/security first, then time-sensitive payment/order issues, then other questions.
4. Ask a focused clarification when intent or a necessary entity is ambiguous.
5. Account, order, payment, stock, and refund status require authenticated system data; knowledge documents alone cannot establish live state.
6. `speak_to_agent` must bypass repeated FAQ suggestions.

## Initial intent list

| Intent | Example queries | Required entities | Resolution strategy | Escalation |
|---|---|---|---|---|
| `create_account` | “How do I sign up?” | None for instructions | `SHO-GEN-FAQ-001`; use approved registration flow | Registration fails or verification issue |
| `password_reset` | “I forgot my password” | None; do not collect password/OTP | `SHO-GEN-FAQ-003`; official reset flow | Recovery unavailable or takeover suspected |
| `contact_support` | “Can I speak to support?” | Issue summary; secure contact preference | `SHO-GEN-FAQ-002` only after channel confirmation | Human requested |
| `change_registered_email` | “Update my account email” | Authenticated account context | `SHO-GEN-FAQ-004`; approved verification workflow | Identity cannot be verified |
| `return_eligibility` | “Can I return this?” | Order/item, delivery date, reason | Approved effective policy; demo example is not enough for real decision | Exclusion/eligibility ambiguous |
| `refund_timeline` | “When will I get my money?” | Order/payment/refund status | Verify payment system; demo 5–7 day example not approved | No confirmed refund status |
| `cancel_order` | “Cancel my shipped order” | Authenticated order and status | Check current state and effective policy | System action unavailable or disputed |
| `product_information` | “Does this device have a warranty?” | Product/SKU, variant, region | Current approved catalogue only | Warranty/safety fact missing |
| `order_tracking` | “Where is my package?” | Authenticated order ID or secure lookup | Live tracking integration required; not present | No current scan, delivered-but-missing |
| `payment_problem` | “I was charged but have no order” | Masked transaction reference, time, amount/currency if approved | Payment/order reconciliation | Immediate payment specialist |
| `technical_issue` | “Checkout keeps failing” | Page/action, time, device, error | `SHO-TROUBLE-001` safe diagnostic | Reproducible/server/payment issue |
| `complaint` | “I’m unhappy with this service” | Category, summary, desired outcome | Acknowledge, classify, record | Severity or repeat issue |
| `privacy_or_security` | “Someone used my account” | Minimal safe incident details | `SHO-PRIV-001` | Immediate L4/security |
| `speak_to_agent` | “I want a person” | Issue summary if volunteered | Stop bot resolution loop, human handoff | Always route |
| `unknown_or_unsupported` | Question lacks relevant approved content | Clarifying context if useful | State lack of verified info; do not guess | Human requested or risk present |

## Entity extraction and data handling

| Entity | Source | Handling |
|---|---|---|
| Customer/account ID | Authenticated system preferred | Do not ask for password or full identity documents in chat |
| Order ID | Customer or authenticated system | Collect only if required; verify ownership |
| Product/SKU/variant | Customer/catalogue | Disambiguate variants |
| Payment method/status/reference | Payment system; limited masked reference from customer if approved | Never request full PAN, CVV, PIN, OTP, banking password |
| Order status/date/amount/refund status | Authenticated order/payment system | Never infer from message text |
| Delivery address | Authenticated profile/order | Avoid repeating full address in chat |
| Issue category/description/preferred resolution | Customer | Ask only relevant details |
| Region, language, channel | Profile/session configuration | Required to apply region-specific policy; all values currently unknown |

The project currently has no authenticated system integrations; intents requiring live entities must escalate or clearly state this limitation.
