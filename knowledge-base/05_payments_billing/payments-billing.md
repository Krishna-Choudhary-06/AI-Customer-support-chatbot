# Payments and Billing

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-PAY-001` |
| Module / submodule | Payments / transaction, charges, invoices, refunds |
| Document type / intent | Troubleshooting and policy template / payment issue |
| Customer segment / region / channel | Payers / `[COMPANY INPUT REQUIRED]` / secure support |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Payment methods and timing unknown / no payment integration documented |
| Related documents | `SHO-ORDER-001`, `SHO-RET-001`, `SHO-PRIV-001`, `SHO-ESC-001` |

## Supported methods and billing rules

Cards, UPI, net banking, wallets, cash on delivery, gift cards, credits, EMI, accepted currencies, taxes, fees, invoice rules, and payment-provider integrations are all `[COMPANY INPUT REQUIRED]`. Do not claim a method is accepted until configured and verified for the customer's region and order.

## Security restrictions

Never request full card numbers, CVV, PIN, OTP, banking password, or a complete payment credential. Ask for only a masked transaction reference through an approved secure channel if the payment team requires it.

## Payment issue diagnostic procedure

1. Classify the symptom: declined, pending, timeout, deducted/no order, duplicate charge, wrong amount, payment method unavailable, invoice issue, or refund not received.
2. Ask the customer to check the official order/payment history and payment-provider status; do not ask them to retry if a duplicate charge may result.
3. Verify order creation, transaction state, currency, amount, and timestamps through trusted systems. The current project has no such integration.
4. Compare the displayed checkout total with confirmed line items, tax, delivery, and discounts. All calculation rules are `[COMPANY INPUT REQUIRED]`.
5. Route unresolved, captured-but-no-order, duplicate, or unauthorized transactions to the payment owner.
6. Do not claim a reversal, refund, or settlement until the payment system confirms it.

## Common cases

| Symptom | Possible causes (not assertions) | Safe handling |
|---|---|---|
| Payment failed | Issuer decline, provider outage, invalid checkout state | Use provider status; suggest another method only if verified as supported |
| Pending / timeout | Delayed provider callback or network interruption | Avoid repeated payment attempts until status is checked |
| Money deducted but no order | Payment/order synchronization issue | Escalate for transaction reconciliation; never promise automatic reversal timing |
| Duplicate debit | Duplicate attempt or authorization/capture differences | Verify each transaction with payment owner |
| Incorrect total / tax | Price, fee, tax, or discount calculation discrepancy | Capture displayed breakdown and escalate; rate and jurisdiction are unknown |
| Invoice / GST invoice | Document generation or tax-profile issue | Route to verified invoice process; legal/tax requirements are unknown |
| Refund not received | Refund state, provider processing, destination-account issue | Check confirmed refund transaction and payment provider; no timeline without approved policy |

## Required configuration

For every method define: availability, currency, authorization/capture semantics, status vocabulary, customer-visible handling, reconciliation owner, refund path, invoice rules, provider references that may be collected, and escalation SLA. All are `[COMPANY INPUT REQUIRED]`.
