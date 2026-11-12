# Customer Account Management

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-ACC-001` |
| Module / submodule | Accounts / access, profile, recovery, privacy |
| Document type / intent | Procedure / account access and profile support |
| Customer segment / region / channel | Account holders / `[COMPANY INPUT REQUIRED]` / chat |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Operational template; company configuration required / recommended safe handling |
| Related documents | `SHO-GEN-001`, `SHO-PRIV-001`, `SHO-ESC-001`, `SHO-TROUBLE-001` |

## Scope and facts

The current application has no authentication, account database, OTP service, or profile-management endpoint. This document is a support design template, not a claim that ShopEase implements these capabilities.

## Safe handling rules

- Never ask a customer to provide a password, OTP, PIN, recovery code, full payment credential, or security answer in chat.
- Do not reveal whether another person's account exists or disclose account details to an unauthenticated requester.
- Use only an approved authenticated account flow to make changes.
- Treat suspected account takeover as urgent security escalation; do not continue ordinary profile-change steps.

## Procedure: login or password reset

1. Ask which step failed and what non-sensitive error is displayed.
2. Confirm whether the customer is using the official sign-in page or app; official URLs are `[COMPANY INPUT REQUIRED]`.
3. For a forgotten password, direct the customer to the visible **Forgot Password** control (demo example).
4. Let the official system deliver and verify recovery challenges. Never collect the challenge in chat.
5. If the recovery channel is unavailable, the account is locked, or suspicious access is reported, stop self-service guidance and escalate under `SHO-PRIV-001`.
6. Do not claim that a reset or unlock completed unless the account system confirms it.

## Procedure: profile, email, phone, or address change

1. Identify the requested field without asking the customer to post sensitive data into public chat.
2. Check whether an authenticated self-service edit exists: `[COMPANY INPUT REQUIRED]`.
3. If not, route to the approved verification and support process: `[COMPANY INPUT REQUIRED]`.
4. Do not change account data based only on a conversational claim.
5. Confirm completion only after a trusted system reports success.

## Feature coverage and unresolved rules

| Topic | Customer-safe response / action | Required company input |
|---|---|---|
| Registration and duplicate accounts | Provide only verified registration steps | Required fields, duplicate-account policy, verification |
| OTP / email / phone verification | Direct customer to official flow; never collect OTP | Channels, retry limits, expiry |
| Address book / multiple addresses | Do not imply capability | Supported fields, limits, order cutoff |
| Suspension / restriction / recovery | Avoid disclosing internal security signals; route privately | Reason visibility, appeal path, owner |
| Account deletion / data access | Acknowledge and route to privacy process | Legal workflow, retention, identity verification |
| Social login / two-factor authentication | Do not claim support | Providers, recovery procedure |

## Escalation

Escalate immediately for suspected account takeover, unauthorized changes, exposed personal data, a customer unable to regain account control, or a request to change account ownership. Required team and service target are `[COMPANY INPUT REQUIRED]`.
