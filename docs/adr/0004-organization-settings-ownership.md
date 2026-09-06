# ADR 0004: Organization settings ownership

- Status: Accepted
- Date: 2026-09-06

## Context

AssoStack must let an organization manage its own public and operational defaults without giving tenant administrators control over installation-level lifecycle and routing identifiers.

The same model must work for the Team SMH deployment and for unrelated organizations without product forks.

## Decision

The `organizations` tenant record contains two classes of data.

### Platform-managed metadata

These fields describe how the tenant exists inside an AssoStack installation and remain restricted to platform administrators:

- `slug`
- `status`

A hosted operator may therefore suspend or rename an internal tenant identifier without granting this capability to organization administrators.

### Organization-managed settings

Organization administrators may update their own tenant record for reusable organization-level configuration, initially:

- display `name`
- default `locale`
- default `timezone`
- public contact email and phone
- public website enabled state and primary domain metadata

The initial defaults are deliberately generic (`en` and `UTC`). A deployment such as Team SMH supplies its own configuration data rather than introducing France- or Team-SMH-specific behavior into the product core.

Editors and members do not receive tenant-settings write permission by default.

## Authorization

Organization settings updates are constrained twice:

1. AssoStack access helpers restrict organization administrators to organization IDs for which they have the `organization-admin` role.
2. Payload's multi-tenant plugin additionally constrains access to tenants assigned to the authenticated user.

Protected platform fields also use field-level access control, so including `slug` or `status` in a crafted organization-admin update cannot modify those values.

## Consequences

The tenant itself is the source of organization-wide defaults needed by later modules and by the future Astro website renderer.

Full CMS/theme configuration remains outside this decision and belongs to milestone 0.2. If settings grow substantially, they may later be split into dedicated tenant-scoped configuration collections without changing the ownership model established here.
