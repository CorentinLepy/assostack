# Association documents

AssoStack keeps private association documents separate from CMS `media`.

## Domain boundary

`documents` is a tenant-scoped upload collection for files that staff use to operate an organization: agreements, administrative PDFs, spreadsheets, supporting images and similar internal material. It is not a public website asset library.

Each document has a title, optional description/category, active or archived lifecycle state, immutable creator attribution, and an optional canonical CRM Contact relationship. When a Contact is linked, the backend verifies that it belongs to the same organization.

## Access model

Organization admins and editors may read, create and update documents inside organizations where they hold those roles. Only organization admins may delete document records. Ordinary members receive no broad document access. Platform administrators retain their platform-wide management capabilities through the shared organization access layer.

Tenant filtering is provided by the same multi-tenant boundary used by the rest of AssoStack, while write hooks independently validate organization access and cross-tenant relationships.

## Private/public separation

CMS `media` remains optimized for public website images and public rendering. Association `documents` uses a separate collection and separate local storage directory. Public content endpoints do not expose `documents`.

The initial implementation uses Payload's upload storage boundary. A later Cloudflare R2 or alternative storage adapter must preserve the collection ACL and tenant boundary rather than changing the document domain model.

## Lifecycle

Documents default to `active` and can be archived without replacing or deleting the underlying historical record. Destructive deletion is deliberately restricted to organization admins. Future modules that create hard references to documents should prefer archive semantics and can add explicit deletion guards when those relationships are introduced.

## Non-goals

This foundation does not implement e-signatures, OCR, public anonymous downloads, document approval workflows, provider-specific storage, or Team SMH-specific taxonomies.
