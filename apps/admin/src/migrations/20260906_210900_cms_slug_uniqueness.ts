import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE UNIQUE INDEX "pages_organization_slug_unique"
      ON "pages" ("organization_id", "slug")
      WHERE "organization_id" IS NOT NULL AND "slug" IS NOT NULL;

    CREATE UNIQUE INDEX "posts_organization_slug_unique"
      ON "posts" ("organization_id", "slug")
      WHERE "organization_id" IS NOT NULL AND "slug" IS NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "posts_organization_slug_unique";
    DROP INDEX IF EXISTS "pages_organization_slug_unique";
  `)
}
