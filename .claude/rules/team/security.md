# Security

Treat every change as security-relevant; OWASP Top 10 is the baseline. The full audit checklist is `checklist.md` in the `security-audit` skill.

- Validate all external input at the boundary (API handlers, forms, webhooks, queue consumers) with the project's schema validator. Reject unknown fields; never spread a request body into a database write (mass assignment).
- Authorize every endpoint and action server-side: check that the user may access this specific resource (no IDOR), not only that they are logged in. Scope every query by tenant in multi-tenant code.
- Never trust the client for user ID, role, tenant ID, price, total, discount, quantity, or credits when the server can derive them.
- Use parameterized queries or the ORM/query builder. Never build SQL/NoSQL queries, shell commands, or file paths from user input. Never render unsanitized HTML.
- Keep secrets out of code, logs, client bundles, and commits. Client-exposed env vars (`NEXT_PUBLIC_*`, `VITE_*`, Flutter `--dart-define`) must never hold secrets.
- Never log tokens, passwords, API keys, payment data, or PII that isn't needed.
- Return generic error messages to clients; keep stack traces and internals in server logs.
- Verify webhook signatures and OAuth `state`.
- Rate-limit auth, OTP, password reset, AI generation, email/SMS, and other costly endpoints; use idempotency keys for payments, refunds, and credit grants.
- Update money, balance, credit, inventory, and quota atomically (transaction or conditional update), and write an audit record for money and permission changes.
- Outbound requests to user-supplied URLs: allowlist hosts and block private and metadata addresses (SSRF).
- File uploads: check content type and size, generate the stored name server-side, restrict access.
- Database and storage security rules (Firestore, Storage, RLS) are part of the change: update them when you add a collection or field, default-deny.
- Check which database and services the local env files point to before running anything. If they reach production, never trigger writes, publishing, emails, or credit-spending jobs; read-only requests only.
