# Business Decision Trees

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-RULE-001` |
| Module / submodule | Operations / refund, return, delivery decisions |
| Document type / intent | Decision framework / triage |
| Customer segment / region / channel | Internal support guidance / `[COMPANY INPUT REQUIRED]` |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Generic verification trees; policy leaves intentionally unconfigured / project prompt |
| Related documents | `SHO-ORDER-001`, `SHO-PAY-001`, `SHO-RET-001`, `SHO-SHIP-001` |

## Refund triage

```mermaid
flowchart TD
  A[Customer asks about refund] --> B{Authenticated order exists?}
  B -- No or unknown --> C[Do not infer; route to order/payment verification]
  B -- Yes --> D{Payment/refund state verified in source system?}
  D -- No --> E[Payment specialist checks transaction]
  D -- Yes --> F{Approved policy says refund eligible?}
  F -- No or unknown --> G[Explain verified rule or escalate]
  F -- Yes --> H{Refund already initiated?}
  H -- No --> I[Authorized operator/system action required]
  H -- Yes --> J{Provider confirms completion?}
  J -- No --> K[Report verified pending state; investigate by approved timeline]
  J -- Yes --> L[Share confirmed outcome; do not promise bank posting date]
```

The actual eligibility criteria, processing timeline, provider state definitions, and escalation threshold are `[COMPANY INPUT REQUIRED]`.

## Return triage

```mermaid
flowchart TD
  A[Return request] --> B[Verify order and item]
  B --> C{Current effective product policy available?}
  C -- No --> D[Do not decide eligibility; human review]
  C -- Yes --> E{Window and item conditions met?}
  E -- No or unclear --> F[Explain only documented rule; offer review path]
  E -- Yes --> G{Evidence/inspection required by policy?}
  G -- Yes --> H[Use approved secure evidence channel]
  G -- No --> I[Submit request via authorized system]
  H --> I
  I --> J{System confirms request?}
  J -- No --> K[Do not claim submitted; escalate]
  J -- Yes --> L[Share confirmed next step]
```

## Delivery complaint triage

```mermaid
flowchart TD
  A[Delivery complaint] --> B[Verify current order and latest event]
  B --> C{Order dispatched?}
  C -- No --> D[Explain only confirmed processing state]
  C -- Yes --> E{Marked delivered?}
  E -- No --> F{Beyond approved delivery threshold?}
  F -- No or threshold unknown --> G[Share verified estimate/status; no invented promise]
  F -- Yes --> H[Open logistics investigation]
  E -- Yes --> I{Customer confirms receipt?}
  I -- Yes --> J[Resolve remaining issue using item/policy flow]
  I -- No --> K[Verify proof-of-delivery process and escalate]
```

All time thresholds, proof rules, and resolution authority require company approval.
