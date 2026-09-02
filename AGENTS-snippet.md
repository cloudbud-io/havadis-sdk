# AGENTS.md snippet for @havadis/sdk consumers

Paste the block below into YOUR repository's `AGENTS.md` / `CLAUDE.md` so
coding agents working in your codebase use the SDK correctly. (It is
published here as a snippet on purpose: agents read your repo root, not
`node_modules`.)

```markdown
## Havadis (@havadis/sdk)

- Content generation runs through `@havadis/sdk` — server-side only; the
  API key lives in `HAVADIS_API_KEY` and must never appear in client code.
- Read `node_modules/@havadis/sdk/docs/` before changing integration code;
  the API reference is `node_modules/@havadis/sdk/openapi.json`.
- Credit-spending calls (`jobs.create`, `topics.suggest`) are idempotent
  via Idempotency-Key; pass a stable key for scheduled/retryable work.
- `completed_with_warnings` is a SUCCESS state. Handle
  `DailySpendCapError`/`RateLimitError` by waiting `retryAfterSeconds`,
  never by looping.
- Embed `cover_image_url` as returned (stable re-signing route); never
  copy raw storage URLs out of other fields.
```
