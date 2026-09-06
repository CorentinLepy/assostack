# Database migrations

AssoStack uses PostgreSQL and Payload's first-party migration system.

The core rule is simple:

> Development may use schema push. Staging and production use committed migrations only.

This separation keeps development fast while making every production schema change reviewable and reproducible.

## Local development

Payload schema push is enabled only when:

- `NODE_ENV=development`; and
- `PAYLOAD_DB_PUSH` is not set to `false`.

The local PostgreSQL database started with Docker Compose is therefore a development sandbox. It can be recreated when needed.

Do not run committed migrations against the same database that has already been evolved using schema push. Payload and Drizzle intentionally treat push-mode development and migration-mode deployment as separate workflows.

## Creating a migration

Finish a coherent schema change first, then create the migration from the repository root:

```bash
pnpm db:migrate:create -- descriptive_name
```

Equivalent admin-workspace command:

```bash
pnpm --filter @assostack/admin migrate:create descriptive_name
```

Payload writes migrations to:

```text
apps/admin/src/migrations/
```

Review both the generated TypeScript migration and its schema snapshot before committing them.

For data transformations, indexes, destructive changes or non-trivial constraints, do not assume generated SQL alone is sufficient. Review and adjust the migration explicitly.

## Checking migration status

```bash
pnpm db:migrate:status
```

## Applying migrations

Against a non-development database:

```bash
pnpm db:migrate
```

The migration commands force `NODE_ENV=production`, which disables schema push. `PAYLOAD_DB_PUSH=false` should also be set explicitly in staging and production environments as defense in depth.

## CI validation

GitHub Actions uses two independent PostgreSQL service databases:

1. **quality** uses development mode for integration tests and may use schema push;
2. **migrations** starts from an empty PostgreSQL database with schema push disabled and applies only the committed migrations.

A pull request must therefore prove both that the current application works and that a fresh installation can be constructed from source-controlled migrations.

Dependency installation in CI uses the committed `pnpm-lock.yaml` with `--frozen-lockfile`.

## Deployment sequence

The initial AssoStack deployment model uses an explicit migration step instead of automatic runtime migrations:

```text
build candidate
    |
verified database backup / recovery point
    |
run pending migrations
    |
if migration succeeds
    v
start / switch to new application release
```

If migrations fail, application rollout stops.

The application does not currently use Payload `prodMigrations` at process startup. This is intentional: migration execution should remain visible to deployment automation and operators.

## Rollback and recovery

`migrate:down` exists as a developer/operator tool:

```bash
pnpm --filter @assostack/admin migrate:down
```

However, a down migration is **not** automatically the preferred production rollback strategy.

For a destructive or data-transforming migration:

- define the recovery plan during review;
- create and verify a database backup/recovery point before applying it;
- decide separately whether the application can be rolled back without rolling back the database;
- do not automatically run destructive down migrations as part of a failed application deployment.

## Production rules

- Never make manual production-only schema changes.
- Never enable schema push in production.
- Never commit database credentials or dumps containing real user data.
- Every production schema change must be represented by a committed migration.
- Review destructive SQL and data transformations explicitly.
- Backups are part of migration safety, not a substitute for migration review.
