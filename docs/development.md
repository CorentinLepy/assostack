# Local development

## Prerequisites

- Node.js 24 LTS (see `.nvmrc`)
- Corepack
- Docker with Compose

The repository currently standardizes on pnpm 11 because it is within Payload 3.x's supported package-manager range.

## First start

```bash
cp .env.example .env
cp apps/admin/.env.example apps/admin/.env
docker compose up -d postgres
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install
pnpm dev
```

The default development endpoints are:

- public Astro application: `http://localhost:4321`
- Payload admin/backend: `http://localhost:3001/admin`
- Payload REST API: `http://localhost:3001/api`
- PostgreSQL: `127.0.0.1:5432`

The database port is deliberately bound to loopback for local development. Production deployments must not expose PostgreSQL publicly.

## Useful commands

```bash
pnpm dev:web
pnpm dev:admin
pnpm typecheck
pnpm build
pnpm --filter @assostack/admin generate:types
```

## Environment files

Real secrets must never be committed. The checked-in `.env.example` files contain development-only placeholders.

Payload reads its application environment from `apps/admin/.env` when run from that workspace. Docker Compose reads the root `.env` file for the local PostgreSQL service.

## Database changes

The schema is intentionally tiny during milestone 0.1. Any future production database change must be represented by a committed migration before AssoStack reaches a stable release.

## Team SMH

Do not add Team SMH configuration or data to this public repository. Team SMH will consume AssoStack as a deployment and may enable reusable modules developed here.
