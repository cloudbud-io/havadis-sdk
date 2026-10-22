---
name: security-audit
description: Security and fraud audit of changed code against the OWASP Top 10 plus business-logic fraud checks (client-trusted prices, roles or IDs, race conditions on balances, missing audit trails). Use when asked for a security review or a güvenlik/fraud/OWASP check, or before shipping auth, payment, upload, or permission changes.
argument-hint: "[path or area; defaults to this session's changes]"
---

# Security and fraud audit

Scope from the user (may be empty): $ARGUMENTS

If no scope is given, use the files created or modified in this session (`git status`, `git diff`) plus the code they call.

1. Map the trust boundaries in scope: where external input enters (HTTP handlers, webhooks, forms, queue messages, file uploads, third-party API responses) and where sensitive actions happen (auth, money, permissions, data export, outbound requests).
2. Go through every item in `checklist.md` (in this skill's directory) for those boundaries.
3. Verify each finding before reporting it: is the path reachable, and does an existing middleware, guard, validator, or security rule already handle it? Drop false positives.
4. Report one table:

| # | Finding | Location (file:line) | Category | Severity | Exploit scenario | Fix |
|---|---------|----------------------|----------|----------|------------------|-----|

Severity: high (exploitable now: data leak, account takeover, money loss), medium, or low.

One row per verified finding and one sentence per cell. No generic advice that isn't tied to a finding. If nothing is found, say so in one line.

Don't change code unless the user asks. When fixing, use the project's existing patterns (validators, guards, middleware, error types) and add a test that proves the fix.

## Commits
When you fix findings, commit each fix on its own, following the team git rule:
- Subject: `fix(scope): summary` in imperative mood, lowercase after the colon, no trailing period, about 72 characters max. Describe the corrected behavior.
- Body: one or two lines stating the vulnerability and its impact, with concrete facts. No file lists, no narration. The test that proves the fix goes in the same commit.
- No `Co-Authored-By` or other AI attribution lines; the developer is the only author. Never push.

Example:

```
fix(brands): check brand ownership before returning reports

Any signed-in user could read another tenant's reports by changing
the brand id in the URL.
```
