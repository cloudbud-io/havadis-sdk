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
import { verifyWebhook, WebhookVerificationError } from '@havadis/sdk';

app.post('/hooks/havadis', express.raw({ type: '*/*' }), (req, res) => {
  try {
    const event = verifyWebhook(req.body, req.headers, process.env.HAVADIS_WEBHOOK_SECRET!);
    // { event: 'content.published', contentId, contentType, slug, title }
    revalidate(event.slug);
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
