# ADR 0005: PostgreSQL migration strategy

- Status: Accepted
- Date: 2026-09-06

## Context

AssoStack uses PostgreSQL through Payload's Postgres adapter. During local development, Payload/Drizzle schema push provides a fast feedback loop, but production database schemas must be reproducible, reviewable and auditable.

Automatic schema mutation at application startup would make production changes harder to review and harder to coordinate with backups, deployment and rollback procedures.

## Decision

AssoStack uses two deliberately separate database workflows.

### Local development and integration tests

Schema push is permitted only when `NODE_ENV=development` and `PAYLOAD_DB_PUSH` is not explicitly set to `false`.

Local development databases are treated as disposable sandboxes. Developers must not use the same database interchangeably for push-mode development and migration execution.

### Non-development environments

Staging and production use source-controlled Payload migrations only.

- schema push is disabled;
- migration files live in `apps/admin/src/migrations`;
- migrations are reviewed like application code;
- deployment runs an explicit migration step before the new application version is started;
- application startup does not automatically execute `prodMigrations` for the initial deployment model.

This makes database changes observable and allows deployment automation to stop before application rollout if a migration fails.

## Migration lifecycle

1. Develop a coherent feature using the local push-mode database.
2. Generate a Payload migration once the schema change is ready for review.
3. Inspect the generated `up` and `down` operations and amend them when data transformation requires explicit logic.
4. Commit the migration with the feature.
5. CI proves that all committed migrations apply to a clean PostgreSQL database with schema push disabled.
6. Staging/production deployment runs pending migrations explicitly before starting the new release.

## Rollback

A database rollback is not assumed to be safe merely because a `down` migration exists. Destructive or data-transforming changes require a reviewed recovery plan and a verified database backup before deployment.

Application rollback and database rollback are therefore separate operational decisions.

## Invariants

- No manual production DDL changes.
- No unreviewed destructive automatic schema changes.
- Every production schema change is represented in source control.
- A clean PostgreSQL database can be constructed using committed migrations only.
- Production credentials are never stored in the repository.
