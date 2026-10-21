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
- `cover_image_url` needs the API key, so never put it in a page: embed a
  published post's cover from the keyless
  `/api/v1/public/brands/{brandId}/contents/{id}/cover`, and never copy raw
  storage URLs out of other fields.
- Serve each post at one path plus the feed's `slug` (`/blog/{slug}`), so
  Havadis knows its address; a route that picks its own paths must report
  them with `contents.reportSitePublication`.
- A Havadis webhook receiver, if any, lives at `POST /api/revalidate` on
  the connected domain, so the connection needs no webhook address.
```
