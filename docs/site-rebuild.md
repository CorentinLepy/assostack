# Static-site synchronization

AssoStack can request a public website rebuild when published content changes without coupling the CMS to a specific deployment provider.

This boundary exists because the public Astro site is designed to be buildable as static output. The CMS owns the content lifecycle; a deployment adapter owns how a new static build is triggered and deployed.

## Configuration

The feature is disabled when `ASSOSTACK_SITE_REBUILD_WEBHOOK_URL` is empty.

```dotenv
ASSOSTACK_SITE_REBUILD_WEBHOOK_URL=https://deploy.example.test/site-sync
ASSOSTACK_SITE_REBUILD_WEBHOOK_TOKEN=
ASSOSTACK_SITE_REBUILD_TIMEOUT_MS=5000
```

`ASSOSTACK_SITE_REBUILD_WEBHOOK_TOKEN` is optional. When configured, AssoStack sends it as a Bearer token in the `Authorization` header and never includes it in the event body or error logs.

The timeout defaults to 5000 ms and is bounded between 250 ms and 30000 ms.

## Contract

AssoStack sends `POST` requests with `Content-Type: application/json`.

Example:

```json
{
  "action": "rebuild",
  "event": "site.sync.requested",
  "occurredAt": "2026-09-07T06:00:00.000Z",
  "organization": {
    "slug": "demo-association"
  },
  "reason": "page.published",
  "version": 1
}
```

The public contract intentionally contains the stable organization slug rather than database IDs.

### Actions

- `rebuild`: regenerate and publish the public website for the organization.
- `disable`: stop serving the organization's previously generated public website, or replace it with the deployment provider's disabled state.

### Reasons

Current reasons are:

- `organization.deleted`
- `organization.disabled`
- `organization.slug-changed`
- `organization.updated`
- `page.deleted`
- `page.published`
- `page.unpublished`
- `page.updated`
- `post.deleted`
- `post.published`
- `post.unpublished`
- `post.updated`

Consumers should primarily branch on `action`. `reason` is intended for observability, diagnostics, and optional provider optimizations.

## Trigger rules

For Pages and Posts:

- draft -> draft: no request;
- draft -> published: `rebuild`;
- published -> published: `rebuild`;
- published -> draft: `rebuild` so removed content disappears from the next build;
- deleting published content: `rebuild`;
- deleting draft-only content: no request.

For Organizations, public-site-affecting changes trigger a sync request. Disabling, suspending, archiving, deleting, or otherwise making the public website unavailable uses `action: disable` so a stale static site is not left online.

## Failure semantics

The webhook is an operational notification, not part of the CMS database transaction.

A timeout, network failure, or non-2xx response is logged as a warning but does **not** roll back the successful CMS write. This keeps content editing available when a deployment provider is temporarily unavailable.

The initial implementation is intentionally synchronous with a short bounded timeout. A durable queue/outbox can be added later if hosted deployments require guaranteed retry semantics.

## Provider boundary

Core collection hooks must not contain provider-specific payloads or API calls.

Examples of acceptable adapters outside the core hook layer include:

- Cloudflare Workers / Pages deploy adapter;
- GitHub Actions repository-dispatch adapter;
- Netlify build-hook adapter;
- Vercel deploy-hook adapter;
- a self-hosted build worker.

Those adapters translate the stable AssoStack contract into the provider's native API.

## Security

- Keep the webhook endpoint private or authenticate it with the optional Bearer token.
- Store real tokens in deployment secrets, never in the repository.
- Do not log authorization headers.
- Validate the organization slug on the receiving side before starting a build.
- The receiver should be idempotent because several content changes can legitimately request overlapping builds.
