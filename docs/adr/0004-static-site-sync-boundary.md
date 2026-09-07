# ADR 0004: Keep static-site synchronization provider-neutral and transaction-safe

- Status: Accepted
- Date: 2026-09-07

## Context

AssoStack's public Astro website can be generated as static output while Payload remains the source of truth for editorial content. Publishing content therefore needs a way to request a new public build.

Hard-coding Cloudflare, GitHub Actions, Vercel, Netlify, or another deployment API inside Payload collection hooks would couple the product core to one hosting strategy and make self-hosting harder.

Calling an external deploy webhook directly from Payload `afterChange` is also unsafe as a production boundary: collection hooks run before Payload commits the surrounding database transaction. A fast deployment receiver could therefore start reading public content before the editorial transaction becomes visible.

## Decision

Payload collection hooks queue a durable `siteSync` job using the same request/transaction as the CMS write. The job is stored in Payload's built-in jobs collection and is not visible to a worker until the database transaction commits.

The `siteSync` task then emits an optional provider-neutral HTTP event named `site.sync.requested`.

The event contains:

- contract version;
- `rebuild` or `disable` action;
- organization slug;
- reason;
- occurrence timestamp.

Jobs use a dedicated `site-sync` queue. Jobs for the same organization are exclusive and newer pending jobs supersede older pending jobs. Delivery retries transient failures with exponential backoff.

Provider-specific adapters live outside collection hooks and translate the stable contract to their deployment service.

## Consequences

- a rolled-back CMS transaction cannot leave behind a rebuild request;
- workers only process committed public state;
- content editing does not wait for external deployment APIs;
- transient provider failures can be retried without changing editorial data;
- Community installations can ignore the mechanism or connect it to any build system;
- hosted AssoStack can implement dedicated provider adapters without changing the CMS domain model;
- static sites can remain independent of backend uptime;
- long-running production deployments can use Payload `autoRun`; serverless or split-worker deployments can process the same queue externally;
- receivers still need to be idempotent because retries and already-running jobs can legitimately produce repeated requests.
