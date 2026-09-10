# Local development

## Prerequisites

- Node.js 24 LTS (see `.nvmrc`)
- Corepack
- Docker with Compose

The repository currently standardizes on pnpm 11 because it is within Payload 3.x's supported package-manager range.

## First start

```bash
pnpm setup:local
pnpm dev
```

`pnpm setup:local` prepares a local development machine only. It verifies required tools, checks the active Node.js version against `package.json`, creates missing local `.env` files from the checked-in examples, generates a local `apps/admin/.env` `PAYLOAD_SECRET` when needed without printing it, installs dependencies when they are missing, starts PostgreSQL through `docker-compose.yml`, waits for PostgreSQL to become healthy, and applies pending Payload migrations. It does not use production Compose files or touch production infrastructure.

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
pnpm test
pnpm build
pnpm --filter @assostack/admin generate:types
pnpm db:migrate:status
```

## Environment files

Real secrets must never be committed. The checked-in `.env.example` files contain development-only placeholders.

Payload reads its application environment from `apps/admin/.env` when run from that workspace. Docker Compose reads the root `.env` file for the local PostgreSQL service.

The local setup command is idempotent: it creates missing env files, but it does not overwrite an existing non-placeholder `PAYLOAD_SECRET`.

## Database changes

Local development uses Payload/Drizzle schema push as a sandbox workflow. Staging and production do not.

Once a schema-changing feature is ready for review, create and commit a Payload migration. Do not run those migrations against a local database that has already been evolved through push mode.

See [database-migrations.md](database-migrations.md) for the full workflow, production rules and rollback expectations.

## Dependency changes

`pnpm-lock.yaml` is committed and CI installs with `--frozen-lockfile`.

When intentionally changing dependencies, run the repository's pinned pnpm version and commit the resulting lockfile update with the dependency change.

## Team SMH

Do not add Team SMH configuration or data to this public repository. Team SMH will consume AssoStack as a deployment and may enable reusable modules developed here.
