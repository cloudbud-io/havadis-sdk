# Feeding your site with Havadis content

The v1 surface exists for one job: your blog renders content Havadis
generated, drafts included, on your stack. The SDK returns wire data —
rendering is deliberately yours (no components, no cache, no framework
peer dependency).

## Static build (SSG)

```ts
// build-posts.ts — run at build time
import { Havadis } from '@havadis/sdk';

const havadis = new Havadis({ apiKey: process.env.HAVADIS_API_KEY! });
const scope = havadis.brand(process.env.HAVADIS_BRAND_ID!);

for await (const item of scope.contents.list({ status: 'published' })) {
  const detail = await scope.contents.get(item.id);
  await writePage({
    slug: detail.slug,
    title: detail.title,
    html: renderMarkdown(detail.body),
    meta: detail.seo_metadata,          // <title>, description, keywords
    faq: detail.aeo_metadata.faq_items, // FAQPage section
    jsonLd: detail.geo_metadata.structured_data, // embed as-is
    cover: detail.cover_image_url,      // stable URL — embed directly
  });
}
```

Why `cover_image_url` is safe to embed: it is an API route that re-signs
storage access on every request. Raw storage URLs expire within 7 days
and would 403 out of a statically built page.

## Pagination that cannot loop

Lists are keyset-paged over an immutable ordering; pass back exactly the
`next_cursor` you were given. A malformed cursor is answered with a 400
(`InvalidCursorError`) — never a silent first page — which is what makes
`for await` auto-pagination safe.

Use `listPage({ cursor, limit, includeTotal: true })` when you need
manual control or a total count.

## Drafts

`status: 'draft'` (or `'all'`) lists unpublished work — preview screens,
editorial dashboards. `published_at` is `null` on drafts; no date is ever
fabricated.

## Publishing from code

```ts
await scope.contents.publish(contentId);      // to your connected site
await scope.contents.unpublish(contentId);
```

The result's `warnings` array uses a stable enum
(`site_refresh_not_triggered`, `channel_state_not_stamped`) — the publish
itself succeeded; a non-critical follow-up degraded.

## Refresh pings

When content is published, Havadis pings your configured site-refresh
webhook with Standard Webhooks signature headers — verify with
`verifyWebhook` (see `webhooks.md`) and rebuild the affected page.
