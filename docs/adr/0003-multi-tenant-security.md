# ADR 0003: Multi-tenant security model

- Status: Accepted
- Date: 2026-09-06

## Context

AssoStack must support both single-tenant self-hosting and hosted multi-tenant deployments. Team SMH is the first real deployment, but tenant boundaries are a product invariant and must be enforced in the backend rather than through UI filtering.

Payload 3.88 provides an official `@payloadcms/plugin-multi-tenant` package which adds tenant relationships, admin tenant selection and tenant-aware access constraints.

## Decision

AssoStack will adopt the official Payload multi-tenant plugin as the low-level tenant scoping mechanism, configured with domain terminology:

- tenant collection: `organizations`
- tenant field on tenant-scoped collections: `organization`
- tenant memberships on users: `organizations[]`

AssoStack will keep authorization semantics in project-owned helpers rather than treating the plugin as the entire authorization model.

There are two levels of privilege:

1. **Platform privileges** — installation-wide capabilities such as `platform-admin`.
2. **Organization roles** — roles stored per user membership, initially `organization-admin`, `editor`, and `member`.

The plugin is responsible for preventing access outside a user's assigned organizations. AssoStack access helpers further restrict operations by organization role where required.

All access-sensitive Local API usage must explicitly set `overrideAccess: false` when acting on behalf of a user.

## Security invariants

- A user with no organization assignment cannot access tenant-scoped business data.
- A user assigned only to organization A cannot read, update or delete organization B data.
- Platform admins have explicit installation-wide access.
- Organization roles are evaluated against the specific organization, not merely against whether the user has the same role somewhere else.
- Tenant-owned collections are protected in the backend even if a request bypasses the admin UI.
- Tests must prove cross-tenant denial.

## Consequences

The product remains compatible with one-organization deployments while retaining the same data model used by hosted multi-tenant installations.

Payload's plugin is an implementation dependency, but AssoStack-owned helpers form the application authorization boundary. This keeps role semantics testable and gives us an escape hatch if the underlying plugin changes in a future Payload major version.
