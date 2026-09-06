# ADR 0002: Initial technical baseline

- Status: Accepted
- Date: 2026-09-06

## Context

AssoStack needs a modern baseline that is current enough for long-term development while avoiding newly released or unsupported combinations in the core. The first milestone must support a static-first public website, an application backend/admin interface, PostgreSQL and a reproducible monorepo workflow.

## Decision

For milestone 0.1 we standardize on:

- Node.js 24 LTS;
- pnpm 11;
- Astro 7 for the public web application;
- Payload 3.88 for the administration/backend application;
- Next.js 16.3 as required by the selected Payload baseline;
- PostgreSQL 18;
- TypeScript 6 for repository code;
- Docker Compose for local infrastructure and the initial self-hosting reference.

Framework dependencies are kept explicit in each application. Significant upgrades will be handled deliberately rather than automatically changing major versions in production.

## Why pnpm 11 instead of the newest pnpm major?

At the time of this decision, Payload 3.88's official blank template declares support for pnpm 9, 10 and 11. We therefore use the newest supported pnpm major rather than moving the core to an unsupported combination simply because a newer pnpm major exists.

## Why TypeScript 6 instead of TypeScript 7?

TypeScript 7 is newly released at the time of this decision. AssoStack values modern tooling, but the core should not adopt a brand-new compiler major before the selected framework stack has had time to validate it broadly. Experimental branches may evaluate TypeScript 7 independently.

## Consequences

- The repository requires an even-numbered supported Node.js release and currently pins Node 24 LTS through `.nvmrc`.
- Astro and Payload live as separate applications in the same workspace and can evolve behind clear boundaries.
- PostgreSQL becomes the default source of truth from the beginning.
- Tooling that is newer than the supported framework matrix can be evaluated in labs without forcing it into the core.
- The baseline must be revisited periodically through a new ADR or an explicit superseding decision.
