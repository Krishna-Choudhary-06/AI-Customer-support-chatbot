# Escalation and Human Support Framework

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-ESC-001` |
| Module / submodule | Support operations / human handoff and incident routing |
| Document type / intent | Escalation policy / speak to agent |
| Customer segment / region / channel | All / `[COMPANY INPUT REQUIRED]` / `[COMPANY INPUT REQUIRED]` |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Proposed framework from project prompt; contacts and SLAs unknown / project-owner prompt |
| Related documents | `SHO-COMP-001`, `SHO-PRIV-001`, `SHO-FOOD-001`, `SHO-ORDER-001` |

## Levels

| Level | Purpose | Example routing | Status |
|---|---|---|---|
| L0 | Bot resolves from current, verified knowledge | Clear FAQ with no account action | Available only for supplied demo FAQ data |
| L1 | General customer support | Human requested; unresolved ordinary issue | Team, channel, hours `[COMPANY INPUT REQUIRED]` |
| L2 | Specialist team | Payment, logistics, product, account specialist | Team ownership `[COMPANY INPUT REQUIRED]` |
| L3 | Senior support / operations | Repeated unresolved or high-impact case | Authority and trigger `[COMPANY INPUT REQUIRED]` |
| L4 | Legal, compliance, fraud, security, formal grievance | Safety emergency, suspected fraud/data exposure, legal grievance | Contacts and emergency procedure `[COMPANY INPUT REQUIRED]` |

## Immediate escalation triggers

- Customer asks for a human agent.
- The bot cannot verify a policy or retrieve an applicable current document.
- Required action involves an account, order, payment, refund, or cancellation system the bot cannot operate.
- Suspected fraud, unauthorized payment, account takeover, or personal-data exposure.
- Safety emergency or serious product/food safety allegation.
- Repeated unresolved complaint or contradictory system records.

## Handoff packet

Transfer only approved minimum details: issue category, customer-provided summary, relevant authenticated case/order reference, verified facts and timestamps, steps attempted, customer-stated desired outcome, urgency trigger, consent/secure contact preference, and source documents consulted. Never include secrets or unnecessary personal data.

## Customer-facing wording

“I can’t verify or complete that safely here. I’ll direct this to the appropriate support team. Please don’t share passwords, one-time codes, or full payment details in chat.”

Do not say a ticket was created or a human will respond by a particular time unless the support system confirms it.
