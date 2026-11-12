# Conversation Scenarios and Multi-turn Handling

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-CONV-001` |
| Module / submodule | Conversational AI / scenario tests and context |
| Document type / intent | Test scenarios / conversation handling |
| Customer segment / region / channel | All / `[COMPANY INPUT REQUIRED]` / chatbot |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Synthetic learning scenarios; no live account/order data / project design |
| Related documents | `SHO-INTENT-001`, `SHO-ESC-001`, `SHO-PRIV-001` |

## Scenario A — Supported password-reset question

1. **Customer:** “I can’t log in; I forgot my password.”
2. **Intent:** `password_reset`.
3. **Entities:** None required for general instructions.
4. **Retrieval:** `SHO-GEN-FAQ-003`.
5. **Verification:** This demo FAQ states: open login and select **Forgot Password**.
6. **Response:** Give that instruction only. Do not claim a reset was completed.
7. **Escalation:** If recovery fails or account takeover is suspected, transfer to account/security support.

## Scenario B — Unsupported shipping charge

1. **Customer:** “How much is delivery?”
2. **Intent:** `order_tracking`/shipping information (clarify if needed).
3. **Retrieval:** No approved shipping-charge record.
4. **Response:** “I don’t have verified ShopEase delivery-charge information yet, so I don’t want to guess.”
5. **Escalation:** Offer the configured human channel only if the channel exists and is confirmed.

## Scenario C — Multiple questions

1. **Customer:** “Can I return this, and when will the refund arrive?”
2. **Intent:** `return_eligibility` + `refund_timeline`.
3. **Entities:** Product/order and delivery date needed for actual eligibility; authenticated refund state needed for timing.
4. **Retrieval:** `SHO-RET-001` contains fictional examples only.
5. **Resolution:** Clearly label demo examples; do not make a customer-specific eligibility or timing promise without verified policy/system data.
6. **Escalation:** Human review for the actual case.

## Scenario D — Angry customer / repeated complaint

1. **Customer:** “I’ve contacted you three times and nobody fixed this.”
2. **Intent:** `complaint`, likely `speak_to_agent`.
3. **Entities:** Prior case reference if customer chooses to provide it; desired outcome.
4. **Response:** Acknowledge frustration without blame; do not make excuses.
5. **Resolution:** Locate history only through authorized support tools; current app has no case system.
6. **Escalation:** Route for human ownership and include concise history.

## Scenario E — Suspected account takeover

1. **Customer:** “Someone changed my account email.”
2. **Intent:** `privacy_or_security`.
3. **Entities:** Minimal incident description; never request password/OTP.
4. **Resolution:** Provide the approved secure account-protection route.
5. **Escalation:** Immediate security team handoff; current contact/process is `[COMPANY INPUT REQUIRED]`.

## Multi-turn state rules

- Reuse a non-sensitive order/product reference already supplied within the same active conversation; do not ask again unnecessarily.
- Re-verify live status before answering a new status question; conversation history is not proof of current state.
- Do not treat earlier model-generated claims as facts. Use retrieved approved documents or trusted systems.
- If the user changes intent, follow the newest request while preserving relevant context.
- When facts conflict, identify the conflict and request clarification or escalate.
- If an unrelated question appears, classify it independently; do not force it into the prior intent.
- Conversation persistence, retention, and session boundaries are `[COMPANY INPUT REQUIRED]`; the current app has no history storage.
