# Public content delivery

AssoStack deliberately separates **editorial access** from **public website delivery**.

## Why this boundary exists

Payload collections such as `pages`, `posts`, and `media` contain editorial state, draft versions, tenant relationships, database identifiers, and other internal fields. The generic Payload collection API is therefore not the public website contract.

The public website consumes a small, explicit, versioned contract instead:

```text
Payload editorial collections
        |
        | privileged server-side query
        v
/api/public/v1/:organization/...
        |
        | sanitized DTOs only
        v
Astro build
        |
        v
static public website
```

The public endpoints may use privileged Payload queries internally because they enforce their own strict organization and publication predicates before serializing a whitelisted DTO. This privilege must never be exposed as a general-purpose query mechanism.

## Public v1 endpoints

```text
GET /api/public/v1/:organization/site
GET /api/public/v1/:organization/pages
GET /api/public/v1/:organization/pages/:slug
GET /api/public/v1/:organization/posts
GET /api/public/v1/:organization/posts/:slug
```

`:organization` is the stable public organization slug. Pages and posts are resolved only inside that organization.

## Publication rules

Public content is returned only when all relevant conditions are true:

- the organization exists;
- the organization lifecycle status is `active`;
- the organization website is not disabled;
- the page/post belongs to that organization;
- the page/post has `_status = published`;
- Payload is queried with draft mode disabled.

A missing, private, draft, disabled, or cross-tenant resource is returned as a generic `404` from the public boundary.

## Data minimization

The public API does not serialize Payload documents directly. Dedicated serializers construct response DTOs from an explicit allowlist.

Internal values such as these must not leak into the public contract unless deliberately introduced in a future API version:

- database IDs;
- organization foreign keys;
- `_status`;
- user records or roles;
- version metadata;
- Payload operational fields;
- internal storage details.

The shared v1 DTO definitions live in `packages/contracts/src/public-content.ts`.

## Caching

Successful public reads are cacheable and currently use a short browser TTL plus a longer shared-cache TTL. This lets a reverse proxy, CDN, or edge platform cache the public contract without coupling AssoStack to a specific provider.

The cache policy may evolve independently from the DTO contract.

## Astro integration

The Astro application remains static by default.

Two build-time environment variables opt it into an organization website build:

```text
ASSOSTACK_API_URL=http://localhost:3001
ASSOSTACK_ORGANIZATION=demo-association
```

If they are absent, `apps/web` builds the generic AssoStack project landing page. This keeps repository CI independent from a running Payload instance.

If they are present, Astro fetches published content during the build. A configured production build is expected to fail when its content API is unavailable rather than silently deploy an incomplete site.

This design means the generated public website can continue serving after a temporary Payload/CRM outage.

## Rich text safety

The first public renderer does not pass CMS HTML through to the browser. It reads the structured Lexical JSON and projects only a small whitelist of supported block types into Astro elements.

Unknown nodes are ignored. This intentionally favors a smaller safe renderer over trusting arbitrary HTML. The whitelist can grow as AssoStack adds richer CMS components.

## Future work

Expected follow-ups include:

- deployment-triggered rebuilds after publication;
- preview flows for authenticated editors;
- richer safe Lexical rendering;
- media storage adapters such as S3-compatible/R2 storage;
- localization;
- API conditional requests (`ETag` / `Last-Modified`) if useful;
- domain-to-organization resolution for hosted multi-tenant deployments.
