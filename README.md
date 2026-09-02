# @havadis/sdk

Typed Node.js SDK for the [Havadis](https://gethavadis.co) REST API — AI
content generation, topic discovery and publishing for your brand, from
your own backend, cron jobs and build pipelines.

- **Server-side only.** The SDK authenticates with a secret API key; the
  `browser` export condition and a runtime guard both refuse to run where
  a `window` exists.
- **Zero runtime dependencies.** Built on the platform's `fetch` and
  `node:crypto`. Node ≥ 22.18, ESM.
- **Safe retries.** GETs retry on 429/5xx with `Retry-After` respected;
  POSTs retry **only** under an `Idempotency-Key` (generated for you), so
  a network blip can never double-charge credits.
- **Typed errors.** `DailySpendCapError.retryAfterSeconds`,
  `InsufficientCreditsError.requiredCredits`, … — every error carries the
  wire `code` and a `requestId` for support.

## Install

```bash
npm install @havadis/sdk
```

## Quick start

```ts
import { Havadis } from '@havadis/sdk';

const havadis = new Havadis({ apiKey: process.env.HAVADIS_API_KEY! });

const [brand] = await havadis.brands.list();
const job = await havadis.brand(brand.id).jobs.createAndWait(
  {
    contentTypes: ['blog'],
    brief: 'How our roasting process changes espresso flavor, for home baristas.',
  },
  { onProgress: (j) => console.log(j.status) },
);

const contentId = job.platforms.find((p) => p.content_id)?.content_id!;
const content = await havadis.brand(brand.id).contents.get(contentId);
console.log(content.title, content.seo_metadata.slug);
```

## Feed your site

```ts
// At build time (SSG) or in a route handler:
for await (const item of havadis.brand(brandId).contents.list({ status: 'published' })) {
  // item.cover_image_url is a stable API route that re-signs storage
  // access per request — safe to embed in generated pages.
  renderCard(item);
}
```

## Webhooks

Havadis signs site-refresh pings with
[Standard Webhooks](https://www.standardwebhooks.com) headers:

```ts
import { verifyWebhook } from '@havadis/sdk';

const event = verifyWebhook(rawBody, req.headers, process.env.HAVADIS_WEBHOOK_SECRET!);
```

`rawBody` must be the exact request bytes — verify **before** JSON parsing.

## Docs

Full guides ship inside the package under
[`docs/`](./docs) (`node_modules/@havadis/sdk/docs/`) and live at
[gethavadis.co/developers](https://gethavadis.co/developers). The OpenAPI
document the types are generated from is committed as
[`openapi.json`](./openapi.json).

## License

MIT
