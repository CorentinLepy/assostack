# 0006 - Organization module enablement

## Status

Accepted.

## Context

AssoStack has a small core that every association needs: organization context, users, contacts, documents and administration. Memberships, events, volunteer scheduling, partnerships, forms and the public website are optional product modules. Hiding a link is not authorization and must not be treated as such.

## Decision

Store enabled modules on the existing organization-owned configuration boundary as `organizations.settings.modules`. The canonical source is now an explicit `enabled` list that uses a module registry enum and normalized relation storage (`organizations_settings_modules_enabled`) with backward-compatible boolean mirrors. Migrations are required because this configuration is business data.

Organization administrators may read and change the enabled modules for their own organization. Platform administrators can configure all modules and see cross-organization operational controls.

Every optional module must enforce enablement on the server in addition to existing tenant and role ACLs. Introduce a shared module-policy adapter that resolves enabled modules and dependencies, and checks the relevant module before collection access, hooks, custom endpoints and background jobs continue. The adapter must deny requests without a resolved organization unless the caller is an explicitly authorized platform administrator. Navigation and dashboard links may use the same resolved policy for discoverability, but never replace server-side checks.

The module catalog is centralized in a registry (`module-registry`) with stable IDs, labels, descriptions, categories, dependencies and visibility metadata. Product navigation and dashboard contracts consume this registry via policy helpers to avoid duplicated module logic.

## Consequences

The enablement migrations add `settings.modules` with every optional module enabled by default, then move canonical storage to the `enabled` relation table while materializing legacy booleans for compatibility. This preserves the behaviour of existing installations and avoids inferring configuration from existing data. Navigation and dashboard visibility use the active organization setting; server-side module enforcement across protected collections, endpoints and jobs remains a required follow-up.

Payload 3.88 provides a stable per-collection list-view extension point. AssoStack now uses this API for a first product-level custom list (`contacts`) with French-first copy, product UI primitives, and module/policy alignment without patching Payload internals.
