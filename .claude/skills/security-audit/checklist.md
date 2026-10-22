# Security and fraud checklist

## Access control
- [ ] Every endpoint and action checks authentication and authorization server-side.
- [ ] Resource ownership is checked per request (no IDOR: changing an ID in the URL or body can't reach someone else's data).
- [ ] Every query in multi-tenant code is scoped by tenant.
- [ ] Role and permission changes require an authorized actor; users can't escalate themselves.
- [ ] Firestore, Storage, and database rules default-deny and cover new collections and fields.

## Injection and input
- [ ] All external input is validated with a schema at the boundary; unknown fields are rejected (no mass assignment).
- [ ] Queries are parameterized or built with the ORM; no string-built SQL/NoSQL, no `$where`, operator injection such as `{ "$gt": "" }` is blocked.
- [ ] No shell commands or file paths are built from user input (command injection, path traversal).
- [ ] Output is encoded; no unsanitized HTML (`innerHTML`, `dangerouslySetInnerHTML`, `v-html`).

## Secrets and crypto
- [ ] No secrets in code, client bundles, logs, or commits; client-exposed env vars hold no secrets.
- [ ] Passwords are hashed with bcrypt or argon2; tokens are random and expire.
- [ ] Webhook signatures and OAuth `state` are verified.

## Business logic and fraud
- [ ] Prices, totals, discounts, quantities, credits, roles, and user and tenant IDs are derived server-side, never trusted from the client.
- [ ] Balance, credit, inventory, and quota updates are atomic (transaction or conditional update); no read-then-write races, no double spend.
- [ ] Payments, refunds, credit grants, and other non-repeatable actions use idempotency keys.
- [ ] Auth, OTP, password reset, invites, AI generation, email/SMS, and other costly endpoints are rate-limited.
- [ ] Money and permission changes write an audit record (who, what, when, before and after).
- [ ] Refund, trial, coupon, and referral flows can't be repeated or chained for profit.

## Configuration
- [ ] Secure defaults: restricted CORS, debug off in production, security headers, cookies `HttpOnly`, `Secure`, and `SameSite`.
- [ ] Clients get generic error messages; stack traces and internals stay in server logs.
- [ ] New dependencies are maintained, necessary, and free of known vulnerabilities.

## Authentication and sessions
- [ ] Sessions and tokens expire and can be revoked; logout invalidates them server-side where applicable.
- [ ] Brute-force protection is in place; error messages and timing don't reveal which accounts exist.

## Data integrity and logging
- [ ] Untrusted data is never deserialized unsafely; uploads are checked by content type and size and renamed server-side.
- [ ] Security-relevant events are logged; tokens, passwords, keys, payment data, and PII that isn't needed are never logged.

## Outbound requests (SSRF)
- [ ] Requests to user-supplied URLs use a host allowlist and block private, link-local, and metadata addresses.
