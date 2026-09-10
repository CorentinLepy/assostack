import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_organizations_settings_modules_enabled" AS ENUM(
      'memberships',
      'events',
      'volunteers',
      'partnerships',
      'forms',
      'website'
    );

    CREATE TABLE "organizations_settings_modules_enabled" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_organizations_settings_modules_enabled",
      "id" serial PRIMARY KEY NOT NULL
    );

    ALTER TABLE "organizations_settings_modules_enabled"
      ADD CONSTRAINT "organizations_settings_modules_enabled_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "organizations_settings_modules_enabled_order_idx" ON "organizations_settings_modules_enabled" USING btree ("order");
    CREATE INDEX "organizations_settings_modules_enabled_parent_idx" ON "organizations_settings_modules_enabled" USING btree ("parent_id");

    INSERT INTO "organizations_settings_modules_enabled" ("order", "parent_id", "value")
    SELECT
      row_number() OVER (PARTITION BY "parent_id" ORDER BY "sort_order") - 1,
      "parent_id",
      "value"::"enum_organizations_settings_modules_enabled"
    FROM (
      SELECT "id" AS "parent_id", 'memberships' AS "value", 1 AS "sort_order"
      FROM "organizations"
      WHERE COALESCE("settings_modules_memberships", true) = true

      UNION ALL

      SELECT "id" AS "parent_id", 'events' AS "value", 2 AS "sort_order"
      FROM "organizations"
      WHERE COALESCE("settings_modules_events", true) = true

      UNION ALL

      SELECT "id" AS "parent_id", 'volunteers' AS "value", 3 AS "sort_order"
      FROM "organizations"
      WHERE COALESCE("settings_modules_volunteers", true) = true

      UNION ALL

      SELECT "id" AS "parent_id", 'partnerships' AS "value", 4 AS "sort_order"
      FROM "organizations"
      WHERE COALESCE("settings_modules_partnerships", true) = true

      UNION ALL

      SELECT "id" AS "parent_id", 'forms' AS "value", 5 AS "sort_order"
      FROM "organizations"
      WHERE COALESCE("settings_modules_forms", true) = true

      UNION ALL

      SELECT "id" AS "parent_id", 'website' AS "value", 6 AS "sort_order"
      FROM "organizations"
      WHERE COALESCE("settings_modules_website", true) = true
    ) AS selected_modules;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "organizations_settings_modules_enabled";
    DROP TYPE "public"."enum_organizations_settings_modules_enabled";
  `)
}