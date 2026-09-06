# CMS architecture

AssoStack's CMS is organization-scoped. The product core manages editorial data, while public website delivery remains a separate concern.

## Initial collections

The 0.2 CMS foundation contains:

- `media` — tenant-scoped images used by websites and content;
- `pages` — versioned long-lived website pages;
- `posts` — versioned news/blog-style content.

These concepts are generic and must not contain Team SMH-specific fields or content.

## Editorial access

Direct Payload collection access is an **editorial/admin API**, not the public website API.

By default:

- platform administrators may operate across organizations;
- organization administrators and editors may create/read/update CMS records in their own organization;
- only organization administrators may delete CMS records;
- organization members do not receive direct CMS collection access;
- unauthenticated callers do not receive direct CMS collection access.

This intentionally prevents an unauthenticated API request from discovering drafts simply because a record exists in Payload.

A later website-delivery layer will expose only published content after resolving the organization from trusted deployment/domain context.

## Drafts and versions

Pages and posts use Payload versions with drafts enabled.

The current defaults are:

- autosave every 1000 ms while editing;
- scheduled publishing enabled;
- at most 50 stored versions per document.

`publishedAt` is populated when a document is first published.

## Slugs

Page/post slugs are URLs within an organization, not global product identifiers.

Therefore these are valid simultaneously:

```text
Organization A -> /about
Organization B -> /about
```

but two `/about` pages in Organization A are invalid.

AssoStack uses two layers:

1. application validation provides a friendly duplicate-slug error scoped to the organization;
2. PostgreSQL uses a composite unique index on `(organization_id, slug)` to protect against concurrent writes and race conditions.

The database constraint is the final integrity guarantee.

## Media

The Community development baseline stores uploaded images on local disk under the admin application. The storage location is ignored by Git and is not part of a tenant deployment's source code.

The CMS core is intentionally not coupled to Cloudflare R2 or another object-storage provider. Hosted/production storage adapters will be added through the integration layer later.

Initial media uploads are image-only and generate a small set of reusable image sizes. Alternative text is required.

Media metadata is tenant-scoped, and page/post media references are checked to ensure the referenced media belongs to the same organization.

## Public website delivery

Astro must not query editorial collections as an anonymous caller and assume that `_status=published` is sufficient tenancy protection.

The follow-up public-content API will be responsible for:

1. resolving a trusted organization context;
2. requesting only records for that organization;
3. returning only published records;
4. selecting a stable public representation rather than leaking internal Payload fields;
5. supporting static builds/revalidation without exposing privileged credentials to browsers.

That boundary keeps the editor/admin API and the public website API independently reviewable.
