# Feeding your site with Havadis content

The v1 surface exists for one job: your blog renders content Havadis
generated, drafts included, on your stack. The SDK returns wire data —
rendering is deliberately yours (no components, no cache, no framework
peer dependency).

## Connecting your site

1. Dashboard → **Settings → Connected accounts → Custom website**: your
   site's name and domain. Leave the webhook address empty.
2. Render each post under one path plus the feed's `slug` (below). That
   is how Havadis knows every post's address; see
   [Where your posts live](#where-your-posts-live).
3. Optional: a webhook receiver at `/api/webhooks/havadis` on the same
   domain, if pages must refresh the moment a post is published
   ([Refresh pings](#refresh-pings-optional)).

Each value is set once: the domain on the connection, the path in your
code (or the brand's post-URL pattern, for a path Google has not seen yet).

## Static build (SSG)

```ts
// build-posts.ts — run at build time
import { Havadis } from '@havadis/sdk';

const havadis = new Havadis({ apiKey: process.env.HAVADIS_API_KEY! });
const scope = havadis.brand(process.env.HAVADIS_BRAND_ID!);
// Keyless and embeddable; see "Cover images" below.
const covers = `https://api.gethavadis.co/api/v1/public/brands/${process.env.HAVADIS_BRAND_ID}/contents`;

for await (const item of scope.contents.list({ status: 'published' })) {
  const detail = await scope.contents.get(item.id);
  await writePage({
    slug: detail.slug,
    title: detail.title,
    html: renderMarkdown(detail.body),
    meta: detail.seo_metadata,          // <title>, description, keywords
    faq: detail.aeo_metadata.faq_items, // FAQPage section
    jsonLd: detail.geo_metadata.structured_data, // embed as-is
    cover: detail.cover_image_url && `${covers}/${detail.id}/cover`,
  });
}
```

## Cover images

`cover_image_url` is a route on the Havadis API that needs your key, so a
visitor's browser cannot load it. A published post's cover is also served
without a key, at
`https://api.gethavadis.co/api/v1/public/brands/{brandId}/contents/{id}/cover`:
put that straight into an `<img>` on your site. It re-signs storage access
on every request (raw storage URLs expire within 7 days and would 403 out
of a statically built page), so it is safe to persist.

For a draft (a preview screen), download the image on your server with
your key and serve your own copy.

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
`site_refresh_not_triggered` is only raised for a webhook address typed on
the connection (see below).

## Where your posts live

Serve every post under one path plus the feed's `slug`, as the build above
does (`/blog/${detail.slug}`, `/tr/yazi/${detail.slug}`, …). Havadis then
knows each post's address the moment it is published and measures its
search performance from the first day. It takes the path from the brand's
post-URL pattern (the "Blog yazısı adres kalıbı" setting, for example
`https://acme.com/blog/{slug}`) or, without one, from your posts Google
already shows (with Search Console connected).

A site that gives posts addresses of its own (a CMS that slugs titles, an
approval queue) reports them instead; see "Telling Havadis where the post
went" in `webhooks.md`. What your site reports always wins.

## Refresh pings (optional)

When content is published, Havadis pings your site's webhook with
Standard Webhooks signature headers — verify with `verifyWebhook` (see
`webhooks.md`) and rebuild the affected page.

A site that reads the feed on every request, or rebuilds on a schedule,
needs no webhook. With no webhook address on the connection, the ping goes
to `https://<your domain>/api/webhooks/havadis`; a failure there is shown
on the connection in the dashboard only.
