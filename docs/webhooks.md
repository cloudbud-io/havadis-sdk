# Webhooks

Havadis signs outbound webhooks (site-refresh pings today) with
[Standard Webhooks v1](https://www.standardwebhooks.com) headers:

```
webhook-id:        msg_...
webhook-timestamp: 1756800000
webhook-signature: v1,BASE64HMAC [v1,BASE64HMAC…]
```

The signature is `HMAC-SHA256(secret, "<id>.<timestamp>.<raw body>")`.
Your signing secret (`whsec_…`) lives next to your site connection in the
dashboard.

## Verifying

```ts
import {
  verifyWebhook,
  WebhookVerificationError,
  type SiteRefreshEvent,
} from '@havadis/sdk';

// The default address: no webhook address to enter on the connection.
app.post('/api/webhooks/havadis', express.raw({ type: '*/*' }), (req, res) => {
  try {
    const event = verifyWebhook<SiteRefreshEvent>(
      req.body,
      req.headers,
      process.env.HAVADIS_WEBHOOK_SECRET!,
    );
    // A test from the dashboard only proves the address and the secret.
    if (event.event === 'webhook.test') return res.sendStatus(204);
    // { event: 'content.published', contentId, contentType, articleFormat, slug, title }
    refreshPost(event.slug);
    res.sendStatus(204);
  } catch (err) {
    if (err instanceof WebhookVerificationError) return res.sendStatus(401);
    throw err;
  }
});
```

Rules the verifier enforces for you:

- **Raw bytes.** Verify the exact request body; a re-serialized JSON
  string will not match. (In Express that means `express.raw`, not
  `express.json`, on this route.)
- **5-minute tolerance** on `webhook-timestamp` (configurable) — blocks
  replay of captured deliveries.
- **Multiple signatures accepted.** During secret rotation Havadis signs
  with both secrets; any single match passes, so rotation is zero
  downtime.
- **Constant-time comparison.**

## Idempotent handling

Deliveries can repeat (retries). `webhook-id` is stable per event — treat
it as your dedupe key.

## Payload

| Field | Notes |
| --- | --- |
| `event` | `content.published`, `content.unpublished` or `webhook.test` |
| `contentId` | Stable id; fetch the content with `contents.get(contentId)` |
| `contentType` | `blog`, `linkedin`, … |
| `articleFormat` | `use_case` for a use-case article (a blog), else `null` |
| `slug` | The path your site serves it under |
| `title` | `content.published` only |

`webhook.test` is sent by the **Send test** button on your site's
connection and carries only `sentAt`. Answer it (and any event you do not
handle) with a 2xx.

## Where the webhook goes

Havadis sends the webhook to the **webhook address** on your site's
connection. Left empty, that is `https://<your domain>/api/webhooks/havadis`.

Serve your receiver there and leave the address empty: the path then lives
in one place, your code, with nothing on the connection to keep in sync.
Enter an address only when the receiver cannot live there (an API on
another host, such as `https://api.acme.com/api/webhooks/havadis`); otherwise
the default address answers `404` or `405` and your site does not hear
about new posts.

A site that pulls the feed needs no webhook. Failures of the default
address are shown on the connection row only: a publish does not report
them in `site_refresh`.

Havadis calls `https` addresses on public hosts only, never follows a
redirect, and waits at most 10 seconds.

## Telling Havadis where the post went

A site that serves each post under the feed's `slug` needs to do nothing:
Havadis builds the address from your post-URL pattern (the brand's
"Blog yazısı adres kalıbı", e.g. `https://acme.com/blog/{slug}`), or from
the posts of yours Google already shows, and measures the post's
performance from the first day.

If your site gives posts addresses of its own, tell Havadis; what your
site reports always wins over the built address.

**At once:** answer `content.published` with JSON:

```ts
// Published right away:
res.status(200).json({ status: 'published', url: 'https://acme.com/blog/my-post' });

// Kept for review (a draft, an approval queue):
res.status(200).json({ status: 'draft', editUrl: 'https://admin.acme.com/posts/42' });
```

**Later** (your approval queue publishes it hours after the webhook):

```ts
await havadis.brand(brandId).contents.reportSitePublication(contentId, {
  status: 'published',
  url: 'https://acme.com/blog/my-post',
});
```

| Field | Notes |
| --- | --- |
| `status` | `published` when the post is live, `draft` while your site holds it |
| `url` | The live post's address. Must be on your connected site (`www.` is fine); ignored on a draft |
| `editUrl` | Where your own editor opens the post (`https` only) |

A post you report as `draft` shows as waiting in the dashboard; reporting
it `published` later dates it and tells the team. An answer without these
fields changes nothing.

## Troubleshooting

The connection row in the dashboard shows how the last delivery went:

| Reason | What to check |
| --- | --- |
| `wrong_address` (404, 405, 410) | The address answers, but nothing there takes the webhook. Enter your receiver's address on the connection. |
| `signature_rejected` (401, 403) | Your receiver's secret is not this connection's `whsec_…` secret (for a GitHub dispatch: the token was refused). |
| `redirected` | The address redirects. Enter the address it redirects to. |
| `address_refused` | Not `https`, or not a public address. |
| `site_error` | Your receiver answered with another error. |
| `unreachable` | No answer within 10 seconds, or the host could not be reached. |
| `not_sent` | Havadis could not prepare the delivery. Try again in a moment. |

A publish whose webhook failed answers with the same reason in
`site_refresh` (`{ reason, http_status }`), unless it went to the default
address (see [Where the webhook goes](#where-the-webhook-goes)).
