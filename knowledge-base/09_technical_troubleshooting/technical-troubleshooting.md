# Technical Troubleshooting

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-TROUBLE-001` |
| Module / submodule | Digital service / web, mobile, network, integrations |
| Document type / intent | Troubleshooting / technical issue |
| Customer segment / region / channel | Customers / all configured regions / support |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Generic safe diagnostic template; product details unknown / project architecture |
| Related documents | `SHO-ACC-001`, `SHO-PAY-001`, `SHO-ESC-001` |

## Universal diagnostic method

1. Clarify what the customer expected and what actually happened.
2. Ask for the page/app feature, approximate time, device/browser/app version, and exact non-sensitive error text.
3. Check service health through an approved monitoring source; the current project has no documented status page.
4. Suggest reversible, low-risk steps one at a time; do not ask the customer to disable security controls or install untrusted software.
5. Protect privacy: redact tokens, passwords, OTPs, payment details, and personal data from screenshots/logs.
6. Record outcome and escalate with the minimum diagnostic facts if unresolved.

## Issue runbooks

### Website unavailable, slow, broken page, or HTTP error
- **Symptoms:** Page fails to load, is slow, or shows an error.
- **Possible causes:** Network issue, browser cache, service outage, expired session, integration failure.
- **Ask:** Which page, time, browser/device, error code; whether it affects other pages.
- **Steps:** Retry once; verify network; use a supported, updated browser (supported list is `[COMPANY INPUT REQUIRED]`); reopen the official site; avoid duplicate checkout/payment attempts.
- **Expected result:** Page loads or error is reproducible with a clear message.
- **Escalate:** Checkout/payment failure, repeated server errors, suspected security warning, or widespread outage.

### Search, checkout, or session failure
- **Symptoms:** Search results absent, cart cannot proceed, session expires.
- **Steps:** Confirm query/cart basics; refresh once; re-authenticate only through official page; do not repeat payment until transaction status is checked.
- **Escalate:** Price/order discrepancy, payment captured without order, or reproducible failure.

### Mobile app crash, freeze, login, OTP, notification, location, install, upload
- **Ask:** App version, device/OS version, action, error, and whether permissions are enabled.
- **Steps:** Relaunch; check official app update; verify the specific permission only if needed; retry on a stable connection; do not reinstall if that risks unsaved data without warning.
- **Expected result:** Feature works or failure can be reproduced.
- **Escalate:** Account access issue, suspected data exposure, repeated crash, or critical order/payment task blocked.

### Payment gateway, third-party, API timeout, or synchronization issue
- Avoid repeated transaction attempts until the transaction state is verified.
- Record time, non-sensitive reference, affected operation, and exact error.
- Escalate to the integration/payment owner. Endpoint names, status page, and incident SLA are `[COMPANY INPUT REQUIRED]`.

## Customer-facing response

“I’m sorry that didn’t work. Please tell me which step failed and the exact error shown—without sharing passwords, codes, or payment details. I can guide you through safe checks or route the issue to support.”
