# AssoStack Architecture

## Product model

AssoStack is a reusable platform for associations and small organizations. The first real production implementation is Team SMH, but the product architecture must remain organization-agnostic.

The product is divided into four layers:

1. **Core** — generic capabilities shared by most organizations.
2. **Modules** — optional reusable business capabilities.
3. **Integrations** — adapters to external providers and services.
4. **Deployments** — tenant-specific branding, configuration and operational concerns.

## Reference stack

### Public web application

- Astro
- TypeScript
- static-first rendering where possible
- configurable themes and content driven by the backend

### Administration and application backend

- Payload
- TypeScript
- REST and/or GraphQL APIs as appropriate
- authentication and access-control policies

### Data

- PostgreSQL
- migrations committed to source control
- tenant-aware business entities

### Self-hosting

- Docker Compose as the initial reference deployment
- environment variables for runtime configuration
- secrets outside source control

### Edge and external services

Adapters may support providers such as:

- Cloudflare R2 for object storage;
- Cloudflare Turnstile for anti-abuse;
- HelloAsso for association payments;
- Brevo or SMTP providers for email;
- automation platforms through webhooks/adapters.

No external provider should become an unavoidable core dependency unless explicitly documented in an ADR.

## Core domain direction

The internal domain should use generic organization terminology rather than association-only terminology where possible.

Likely core concepts include:

- Tenant / Organization
- User
- Role / Permission
- Contact
- Organization contact/company
- Event
- Task
- Activity / Interaction
- Document
- Form
- Notification
- Audit event

Association-specific concepts such as memberships, volunteers and donations should be reusable modules unless later experience proves they belong in core.

## Multi-tenancy

Multi-tenancy is a first-class architectural concern.

Tenant-scoped records must include explicit tenant ownership and tenant-aware authorization. Queries must not rely only on UI filtering. Cross-tenant access must be denied at the backend and covered by automated tests.

AssoStack should ultimately support both:

- **single-tenant self-hosting** — one organization per deployment;
- **multi-tenant hosted deployments** — multiple organizations sharing an installation with strong logical isolation.

## Public content delivery boundary

The public website does not consume the generic Payload collection APIs directly. Editorial collections contain drafts, tenant relationships and operational fields that are not a stable public contract.

AssoStack therefore exposes an explicit versioned public-content boundary:

```text
Payload CMS / PostgreSQL
        |
        | published + organization-scoped queries
        v
Public content API v1
        |
        | minimal sanitized DTOs
        v
Astro static build
        |
        v
Public website
```

This gives the public site three useful properties:

- drafts and editorial metadata stay behind the administrative boundary;
- the frontend depends on a small versioned contract instead of Payload's internal document shape;
- the built static site can remain online during a temporary backend/CRM outage.

When an Astro organization build is configured, backend unavailability is a build failure rather than a silent fallback to incomplete content. Without organization build configuration, the repository still builds the generic AssoStack project landing page for development and CI.

See `docs/public-content.md` for the current public API and rendering rules.

## Team SMH boundary

Team SMH configuration can include:

- branding;
- domain names;
- enabled modules;
- integration credentials/references;
- organization-specific content;
- organization-specific extensions.

It must not introduce Team SMH-specific assumptions into generic core packages.

## Extensibility

New functionality should normally enter the system as one of:

- a core capability;
- a reusable module;
- a provider integration;
- deployment-specific configuration/extension.

The correct layer should be decided before implementation.

## Experimental technology

AssoStack is also intended as a controlled experimentation platform. Experimental tools may be introduced when they are isolated from critical business data and core stability through:

- adapters;
- separate services;
- feature flags;
- dedicated development/lab environments;
- explicit ADRs when experiments become production dependencies.

## Initial deployment model

For the first Team SMH implementation, the target direction is:

```text
Public Internet
    |
Cloudflare
    |
+-------------------------+
|                         |
Public Astro web      Private/admin access
                         |
                     Payload
                         |
                    PostgreSQL
```

The exact deployment topology will be decided during the infrastructure phase and documented in an ADR.
