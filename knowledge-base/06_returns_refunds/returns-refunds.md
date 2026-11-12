# Returns, Replacements, Refunds, and Cancellations

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-RET-001` |
| Module / submodule | Post-purchase / returns, replacements, refunds, cancellation |
| Document type / intent | Policy and workflows / return or refund |
| Customer segment / region / channel | Customers / `[COMPANY INPUT REQUIRED]` / authenticated support |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Fictional examples need approval; complete policy unknown / user-provided ShopEase examples |
| Related documents | `SHO-ORDER-001`, `SHO-PAY-001`, `SHO-SHIP-001`, `SHO-ESC-001` |

## Demo examples — not approved policy

The supplied fictional examples state:

- Product returns may be requested within 7 days of delivery if return conditions are met.
- Approved refunds are processed within 5–7 business days.
- Shipped orders cannot be cancelled through the standard cancellation process; customer should contact support.

These are demo statements only. The project does not define qualifying products, exact window calculation, exclusions, evidence, approval criteria, pickup, replacement availability, refund start point, payment-provider delay, cancellation fees, or jurisdictional rights. Do not treat the examples as production policy.

## Return / replacement decision workflow

1. Verify order and item through the authenticated order system.
2. Retrieve the applicable product-specific policy and effective version.
3. Check purchase/delivery date, item condition, reason, and documented eligibility.
4. Ask for evidence only when policy requires it and through an approved protected channel.
5. Confirm pickup or return method from current operational availability.
6. Submit the request only through a system that confirms receipt.
7. Explain the confirmed next step; do not promise approval or replacement stock.
8. Escalate unclear eligibility, disputed rejection, damaged/safety issue, or repeated failure.

## Refund decision workflow

```text
Order exists and is authenticated?
  No → do not infer; route to order/payment investigation
  Yes → payment captured or otherwise eligible under confirmed policy?
          No/unknown → payment specialist verifies state
          Yes → cancellation/return/refund eligibility confirmed?
                   No/unknown → explain verified rule or escalate; never invent eligibility
                   Yes → refund already initiated?
                            Yes → report only the confirmed provider status
                            No → authorized system action required; chatbot cannot claim completion
```

Refund destination, partial-refund calculation, store credit, processing time, and failed-refund procedure are `[COMPANY INPUT REQUIRED]`.

## Cancellation handling

1. Verify order and current fulfillment state.
2. Check the effective cancellation rule for that item and state.
3. The supplied demo example says shipped orders cannot use the standard cancellation process; support should be contacted.
4. If the order has not shipped, do not assume cancellation is available; confirm using the order system and approved policy.
5. Report cancellation only after the system confirms success.
6. Explain refund handling only from confirmed transaction status and approved timeline.

## Required policy decisions

Eligibility by category, return window start/end, non-returnable items, opened/used products, damaged/wrong/missing items, evidence, pickup/self-shipping, inspection, replacement rules, cancellation cutoff, fees, refund method, partial refunds, refund statuses, processing time, appeal path, and legal exceptions are all `[COMPANY INPUT REQUIRED]`.
