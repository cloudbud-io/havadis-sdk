# Getting started

## 1. Mint an API key

Dashboard → **Settings → Developer → New key**. The plaintext
`havadis_<prefix>_<secret>` token is shown **once** — store it in a secret
manager and pass it as an environment variable. Keys can be narrowed to a
scope subset at creation; the full catalog is:

`brands:read` `brands:write` `content:read` `content:write` `topics:read`
`topics:write` `jobs:read` `jobs:write` `credits:read` `billing:read`

Server-side only: never put the key in client-side code. The SDK refuses
to construct where a `window` exists, and the package's `browser` export
condition makes bundlers fail the build.

## 2. First call

```ts
import { Havadis } from '@havadis/sdk';
const havadis = new Havadis({ apiKey: process.env.HAVADIS_API_KEY! });
console.log(await havadis.me.get());
```

`me.get()` answers with the tenant, the key's **effective** scopes and its
limits — the fastest way to verify wiring.

## 3. Preview cost, then generate

```ts
const brand = (await havadis.brands.list())[0]!;
const scope = havadis.brand(brand.id);

// Free — no credits move:
const { costs } = await scope.jobs.costPreview({ contentTypes: ['blog'] });

// Charges credits; an Idempotency-Key is auto-generated:
const job = await scope.jobs.createAndWait({
  contentTypes: ['blog'],
  brief: 'A practical guide to onboarding remote engineers in week one.',
});
```

`completed_with_warnings` is **success** — the content generated while a
non-critical step (QA, source scraping, AEO/GEO) degraded.

## 4. Read and render

```ts
const detail = await scope.contents.get(contentId);
// detail.body               — markdown
// detail.seo_metadata       — meta title/description/keywords/slug
// detail.aeo_metadata       — featured snippet target + FAQ items
// detail.geo_metadata       — citations + embeddable JSON-LD
// detail.cover_image_url    — stable API route; embed as-is
// detail.article_format     — 'use_case' for a use-case article, else null
```

## 5. Discover topics

Discovery is asynchronous: queue a run, wait for it, read the suggestions.

```ts
const { run_id } = await scope.topics.suggest({
  contentType: 'blog',
  // Optional: one suggestion per industry the product fits, each with a
  // fit score; blogs approved from them are written as use-case articles.
  focus: { source: 'product_page', url: 'https://yourbrand.com/product' },
});
await scope.topics.waitForRun(run_id); // TopicRunFailedError carries errorCode
const topics = await scope.topics.list({ status: 'pending' });

// Approve one into a job: the suggestion leaves the pending list and its
// format, origin and product page carry over.
await scope.jobs.createAndWait({
  contentTypes: ['blog'],
  brief: topics[0].suggested_brief,
  suggestionId: topics[0].id,
});
```

A page Havadis cannot read fails the run with
`error_code: 'product_page_unreadable'`, and its credits are refunded.

## Limits you will meet

| Limit | Where | What to do |
| --- | --- | --- |
| Plan rate limit (per minute) | `RateLimitError.retryAfterSeconds` | The SDK already retries GETs; slow your loop |
| Daily credit cap per key (default 50) | `DailySpendCapError` | Raise it in Settings → Developer, or wait for UTC midnight |
| Credit balance | `InsufficientCreditsError.requiredCredits` | Top up in the dashboard |
