---
name: havadis
description: Use when integrating a codebase with the Havadis content API — generating AI blog/social content for a brand, listing or rendering that content on a site, publishing it, discovering topics, or verifying Havadis webhooks. Covers @havadis/sdk (Node) and the raw /api/v1 REST surface, auth with havadis_ API keys, idempotency, rate/spend limits and typed errors.
---

# Havadis API & SDK

Havadis generates brand-aware content (blog, LinkedIn, Instagram,
Pinterest, X, viral, ad creatives) and this surface lets a backend drive
it: create generation jobs, read the results (drafts included), publish
to the customer's site, discover topics.

## Ground rules

- **Server-side only.** Keys look like `havadis_<prefix>_<secret>` and
  must never reach a browser bundle; the SDK throws if a `window` exists.
- **Prefer the SDK** (`npm i @havadis/sdk`, Node ≥22.18, ESM). Raw REST
  base is `https://api.gethavadis.co/api/v1` with
  `Authorization: Bearer <key>`; machine-readable spec at
  `GET /api/v1/openapi.json`.
- **Docs ship in the package** — read `node_modules/@havadis/sdk/docs/`
  (getting-started, errors-and-retries, feeding-your-site, webhooks)
  instead of guessing endpoints from memory.

## Canonical flows

```ts
import { Havadis } from '@havadis/sdk';
const havadis = new Havadis({ apiKey: process.env.HAVADIS_API_KEY! });
const scope = havadis.brand(brandId);
```

1. **Generate**: `scope.jobs.createAndWait({ contentTypes: ['blog'], brief })`
   — 202-async under the hood; `completed_with_warnings` IS success.
   Cost check first (free): `scope.jobs.costPreview({ contentTypes })`.
2. **Render**: `for await (const c of scope.contents.list({ status: 'published' }))`
   then `scope.contents.get(id)` → `body` (markdown), `seo_metadata`,
   `aeo_metadata.faq_items`, `geo_metadata.structured_data` (embed
   as-is), `cover_image_url` (stable re-signing route — embed directly,
   never a raw storage URL).
3. **Publish**: `scope.contents.publish(contentId)` (v1 channel:
   custom_website only). `warnings` is a stable enum, not prose.
4. **Topics**: `const { run_id } = await scope.topics.suggest()` (async)
   → `await scope.topics.waitForRun(run_id)` → `scope.topics.list()`.
   Pass `focus: { source: 'product_page', url }` for one suggestion per
   industry the product fits (`segment.fit_score`; blogs become use-case
   articles, `article_format: 'use_case'`). A failed run throws
   `TopicRunFailedError` with a stable `errorCode` (e.g.
   `product_page_unreadable`, credits refunded). Approve a suggestion into
   a job with `jobs.create({ ..., suggestionId })` — never by copying its
   brief alone, or its format and research page are lost.
5. **Webhooks**: `verifyWebhook<SiteRefreshEvent>(rawBody, headers, whsecSecret)`
   — Standard Webhooks v1; verify raw bytes BEFORE parsing. Use-case
   articles arrive as `contentType: 'blog'` with `articleFormat: 'use_case'`.

## Money-safety rules (do not improvise)

- Credit-spending POSTs (jobs.create, topics.suggest) REQUIRE an
  `Idempotency-Key`; the SDK auto-generates one per call. For retries
  across restarts, pass a stable key — the server replays for 24h.
- Never retry a POST without that key. The SDK's retry loop already
  encodes this; keep it if hand-rolling REST.
- Expect and handle: `RateLimitError`/`DailySpendCapError` (both carry
  `retryAfterSeconds`), `InsufficientCreditsError` (`requiredCredits`).
  Every key has a daily credit cap (default 50) — surface the wait, don't
  hammer.

## Error contract

Closed envelope `{ error: { type, code, message, ... }, request_id }`
with frozen English `code`s. Map codes, not messages; quote `request_id`
in support escalations. A malformed pagination cursor is a 400
(`invalid_cursor`) — pass back `next_cursor` verbatim, never construct
cursors.
