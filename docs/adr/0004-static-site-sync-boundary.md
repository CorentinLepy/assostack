# ADR 0004: Keep static-site synchronization provider-neutral

- Status: Accepted
- Date: 2026-09-07

## Context

AssoStack's public Astro website can be generated as static output while Payload remains the source of truth for editorial content. Publishing content therefore needs a way to request a new public build.

Hard-coding Cloudflare, GitHub Actions, Vercel, Netlify, or another deployment API inside Payload collection hooks would couple the product core to one hosting strategy and make self-hosting harder.

## Decision

Payload emits an optional provider-neutral HTTP event named `site.sync.requested`.

The event contains:

- contract version;
- `rebuild` or `disable` action;
- organization slug;
- reason;
- occurrence timestamp.

Provider-specific adapters live outside collection hooks and translate this contract to their deployment service.

Webhook delivery failure does not roll back a successful CMS write. Delivery uses a bounded timeout and can be disabled entirely by leaving the webhook URL unset.

## Consequences

- Community installations can ignore the mechanism or connect it to any build system.
- Hosted AssoStack can implement dedicated provider adapters without changing the CMS domain model.
- Static sites can remain independent of backend uptime.
- The initial synchronous notification is best-effort, not a durable queue. Guaranteed delivery/retry may require an outbox or worker in a later milestone.
- Receivers should be idempotent because multiple content writes may legitimately request overlapping builds.
