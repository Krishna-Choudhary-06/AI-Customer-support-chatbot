# Order Management and Lifecycle

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-ORDER-001` |
| Module / submodule | Orders / lifecycle, status, changes, delivery issues |
| Document type / intent | Operational procedure / order support |
| Customer segment / region / channel | Customers / `[COMPANY INPUT REQUIRED]` / authenticated support |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Workflow template; no order-system integration exists / recommended verification controls |
| Related documents | `SHO-PAY-001`, `SHO-RET-001`, `SHO-SHIP-001`, `SHO-ESC-001` |

## Order lifecycle model

The following are generic lifecycle states for implementation design, not confirmed ShopEase states or customer-visible promises:

```text
Created → Payment verification → Processing → Accepted → Packed/prepared
        → Dispatched → In transit → Out for delivery → Delivered
        → Return/cancellation/refund workflow → Closed
```

Actual state names, transitions, responsible parties, and allowed changes are `[COMPANY INPUT REQUIRED]`. The current app has no order lookup.

## Order inquiry procedure

1. Determine the request: place, modify, cancel, track, status discrepancy, missing, partial, wrong, or delivered-but-not-received.
2. Use an authenticated order system to locate the order. The bot must not claim to look it up when no integration exists.
3. Verify current status and its timestamp from the system of record.
4. Check the applicable, effective policy and whether the requested action remains available at this state.
5. Explain the verified next step without promising an unconfirmed outcome.
6. Escalate when status is contradictory, the system is unavailable, money was charged without an order, delivery is disputed, or action requires an operator.

## Issue-handling matrix

| Issue | Verify | Safe next action | Escalate when |
|---|---|---|---|
| Confirmation missing | Order record and notification status | Ask customer to check official order history; do not infer order existence | Payment captured but no order record |
| Delayed / status appears wrong | Latest system event and timestamp | Explain only verified state; delay thresholds are `[COMPANY INPUT REQUIRED]` | Stale or contradictory tracking |
| Duplicate order | Distinct order IDs and payment captures | Do not cancel or refund without system confirmation | Duplicate charge or irreversible fulfillment |
| Marked delivered but not received | Delivery timestamp, address, proof-of-delivery source | Follow approved investigation process; no invented delivery-partner details | Always route to logistics investigation if customer disputes receipt |
| Missing / wrong / partial item | Order lines, package record, customer description | Record affected items and use approved resolution policy | Safety issue, repeated problem, or policy unclear |
| Modify address / item | Current fulfillment state and allowed actions | Explain whether an authenticated system offers the change | Change no longer available or order already dispatched |
| Cancel | Current state, cancellation policy, payment status | Submit only through verified cancellation action | Cancellation unavailable or charge/refund disputed |

## Evidence and privacy

Ask only for the minimum information required by an authenticated support system. Do not ask for password, OTP, full card number, CVV, UPI PIN, or unrelated personal documents in chat. Required identifiers and verification policy are `[COMPANY INPUT REQUIRED]`.
