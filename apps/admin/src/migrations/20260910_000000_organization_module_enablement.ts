import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "organizations" ADD COLUMN "settings_modules_memberships" boolean DEFAULT true NOT NULL;
    ALTER TABLE "organizations" ADD COLUMN "settings_modules_events" boolean DEFAULT true NOT NULL;
    ALTER TABLE "organizations" ADD COLUMN "settings_modules_volunteers" boolean DEFAULT true NOT NULL;
    ALTER TABLE "organizations" ADD COLUMN "settings_modules_partnerships" boolean DEFAULT true NOT NULL;
    ALTER TABLE "organizations" ADD COLUMN "settings_modules_forms" boolean DEFAULT true NOT NULL;
    ALTER TABLE "organizations" ADD COLUMN "settings_modules_website" boolean DEFAULT true NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "organizations" DROP COLUMN "settings_modules_website";
    ALTER TABLE "organizations" DROP COLUMN "settings_modules_forms";
    ALTER TABLE "organizations" DROP COLUMN "settings_modules_partnerships";
    ALTER TABLE "organizations" DROP COLUMN "settings_modules_volunteers";
    ALTER TABLE "organizations" DROP COLUMN "settings_modules_events";
    ALTER TABLE "organizations" DROP COLUMN "settings_modules_memberships";
  `)
}
