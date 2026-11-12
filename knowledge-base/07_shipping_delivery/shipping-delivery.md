# Shipping, Delivery, and Logistics

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-SHIP-001` |
| Module / submodule | Fulfillment / shipping, tracking, delivery exceptions |
| Document type / intent | Procedure and FAQ template / delivery support |
| Customer segment / region / channel | Customers / `[COMPANY INPUT REQUIRED]` / authenticated order support |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | No delivery policies or logistics integration supplied / unknown |
| Related documents | `SHO-ORDER-001`, `SHO-RET-001`, `SHO-ESC-001` |

## Policy fields that must remain unknown until supplied

Serviceable locations, carriers, shipping methods, charges, promised date calculation, standard/express/same-day availability, tracking URL, delivery attempts, address-change cutoff, rescheduling, proof of delivery, lost shipment criteria, and logistics response targets are `[COMPANY INPUT REQUIRED]`.

## Tracking and delivery investigation

1. Authenticate and locate the order in the trusted order system; the current app cannot do this.
2. Read the latest carrier/system event and its timestamp.
3. Distinguish an estimated date from a guarantee; only repeat the exact approved status wording.
4. For a delay, compare the estimate with the approved delay threshold; if absent, do not label it late based on an invented SLA.
5. If marked delivered but not received, verify proof-of-delivery availability and start the approved investigation.
6. For lost, damaged, misdirected, or failed delivery, preserve the order reference and non-sensitive facts, then transfer to logistics.
7. Never invent a carrier, delivery-partner identity, location, or tracking update.

## Issue matrix

| Customer report | Verify | Resolution path | Escalation trigger |
|---|---|---|---|
| Tracking unavailable | Dispatch state, carrier reference, last event | Explain verified status or report tracking unavailable | No event beyond company threshold (threshold unknown) |
| Address needs change | Current state and supported change action | Use authenticated change if permitted | Dispatched or system does not confirm change |
| Customer unavailable / failed attempt | Attempt event and reschedule rules | Offer only documented options | Repeat failure or no approved next step |
| Package marked delivered but missing | Delivery timestamp and proof process | Open logistics investigation | Always investigate disputed receipt |
| Parcel damaged / missing lines | Package and order lines; approved evidence rules | Route to return/replacement policy | Safety hazard, high-value dispute, or unclear eligibility |
| Delivery conduct complaint | Customer account of event; do not interrogate | Acknowledge and transfer securely | Threat, safety concern, harassment, or immediate danger |

## Customer-facing limitation

Without a verified tracking integration, the chatbot must say it cannot look up the live order and direct the customer to the verified order-history/support path. Never imply that it has checked a shipment.
