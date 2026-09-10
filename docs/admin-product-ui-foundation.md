# Admin product UI foundation

## Purpose

This document defines how AssoStack builds product-level admin UX on top of Payload public extension points, without modifying Payload core behavior.

## Principles

- Payload remains the admin engine and schema authority.
- AssoStack controls product identity, information architecture and copy.
- Module visibility improves discoverability only; it does not replace ACL enforcement.
- Tenant isolation and role access remain mandatory invariants.
- Product-level customizations use stable APIs and import map generation.

## Extension points used

- Global admin shell:
  - `admin.components.graphics.Icon` and `admin.components.graphics.Logo`
  - `admin.components.Nav`
  - `admin.components.views.dashboard`
- Collection-specific views:
  - `collection.admin.components.views.list`

## UI primitives

Reusable UI primitives live under `apps/admin/src/admin/ui`:

- `PageHeader`
- `SectionHeader`
- `Card`
- `EmptyState`
- `Badge`
- `LinkButton`

These components provide consistent typography, spacing and action patterns for custom views.

## Module foundation

- `module-registry` is the single module catalog source.
- `module-policy` resolves configured modules, expands dependencies and computes effective enablement.
- Organization settings persist optional module enablement via `settings.modules.enabled` with compatibility mirrors.

## Delivered product slice

Contacts list now uses a custom list view component:

- Entry: `Contacts.admin.components.views.list`
- Component: `@/admin/contacts/ContactsListView#ContactsListView`

Behavior:

- French-first product copy and headings.
- Search and status quick filters.
- Card-based contact presentation.
- Permission-aware create action.
- Empty state with guided next action.
- Pagination controls based on Payload list data.

## Testing strategy

- Keep behavior contracts in focused tests:
  - Admin product UX tests for navigation, branding and list-view registration.
  - Module policy tests for selection and dependency rules.
- Keep tenant and authorization behavior under existing integration suites.

## Deferred work

- Add server-side module enforcement hooks for all optional-domain endpoints/jobs.
- Add reusable query/filter helper for custom list views to reduce per-view boilerplate.
- Add visual regression checks for custom admin views.
