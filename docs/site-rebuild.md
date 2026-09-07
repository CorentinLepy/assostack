# Static-site synchronization

AssoStack can request a public website rebuild when published content changes without coupling the CMS to a specific deployment provider.

This boundary exists because the public Astro site is designed to be buildable as static output. The CMS owns the content lifecycle; a deployment adapter owns how a new static build is triggered and deployed.

## Delivery model

Public changes do **not** call the deployment provider directly from a Payload collection hook.

Instead, the hook queues a `siteSync` Payload job using the same request/transaction as the content change. That gives the synchronization request useful transactional semantics:

- if the CMS transaction rolls back, the queued job rolls back with it;
- a worker cannot see the job until the database commit is visible;
- the external rebuild therefore cannot race an uncommitted content write;
- the CMS request does not wait for the deployment provider;
- transient delivery failures can be retried independently of the editorial write.

Jobs use the `site-sync` queue. Jobs for the same organization are exclusive, and a newer pending job supersedes an older pending one because a static rebuild only needs the latest committed public state.

## Configuration

The feature is disabled when `ASSOSTACK_SITE_REBUILD_WEBHOOK_URL` is empty or invalid.

```dotenv
ASSOSTACK_SITE_REBUILD_WEBHOOK_URL=https://deploy.example.test/site-sync
ASSOSTACK_SITE_REBUILD_WEBHOOK_TOKEN=
ASSOSTACK_SITE_REBUILD_TIMEOUT_MS=5000
ASSOSTACK_JOBS_AUTORUN=
```

`ASSOSTACK_SITE_REBUILD_WEBHOOK_TOKEN` is optional. When configured, AssoStack sends it as a Bearer token in the `Authorization` header and never includes it in the event body or error logs.

The HTTP timeout defaults to 5000 ms and is bounded between 250 ms and 30000 ms.

On a normal long-running production deployment, the Payload job runner is enabled by default and checks the `site-sync` queue every five seconds. Set `ASSOSTACK_JOBS_AUTORUN=false` when a separate worker or external Payload jobs endpoint owns queue processing. `ASSOSTACK_JOBS_AUTORUN=true` can explicitly enable it in another environment.

## Contract

The worker sends `POST` requests with `Content-Type: application/json`.

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

- `organization.created`
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

- draft -> draft: no job;
- draft -> published: queue `rebuild`;
- published -> published: queue `rebuild`;
- published -> draft: queue `rebuild` so removed content disappears from the next build;
- deleting published content: queue `rebuild`;
- deleting draft-only content: no job.

For Organizations, creating an active public website and changing public-site-affecting configuration requests a rebuild. Disabling, suspending, archiving, deleting, or otherwise making the public website unavailable uses `action: disable` so a stale static site is not left online.

## Failure and retry semantics

The `siteSync` task retries transient delivery failures up to three times with exponential backoff. Successful jobs are removed by Payload's normal jobs configuration.

A timeout, network failure, or non-2xx response is logged by the worker. It does **not** roll back the already committed CMS write.

This is deliberately stronger than a direct `afterChange -> fetch()` implementation: delivery is asynchronous, transaction-safe and observable through Payload's job system.

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
- The receiver should be idempotent because job retries and overlapping public changes can legitimately cause repeated requests.
