import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_contacts_kind" AS ENUM('person', 'organization');
  CREATE TYPE "public"."enum_contacts_status" AS ENUM('active', 'archived');
  ALTER TABLE "contacts" ADD COLUMN "kind" "enum_contacts_kind" DEFAULT 'person' NOT NULL;
  ALTER TABLE "contacts" ADD COLUMN "status" "enum_contacts_status" DEFAULT 'active' NOT NULL;
  ALTER TABLE "contacts" ADD COLUMN "archived_at" timestamp(3) with time zone;
  ALTER TABLE "contacts" ADD COLUMN "person_first_name" varchar;
  ALTER TABLE "contacts" ADD COLUMN "person_last_name" varchar;
  ALTER TABLE "contacts" ADD COLUMN "organization_details_name" varchar;
  ALTER TABLE "contacts" ADD COLUMN "organization_details_legal_name" varchar;
  ALTER TABLE "contacts" ADD COLUMN "organization_details_registration_number" varchar;
  ALTER TABLE "contacts" ADD COLUMN "organization_details_website" varchar;
  ALTER TABLE "contacts" ADD COLUMN "address_line1" varchar;
  ALTER TABLE "contacts" ADD COLUMN "address_line2" varchar;
  ALTER TABLE "contacts" ADD COLUMN "address_postal_code" varchar;
  ALTER TABLE "contacts" ADD COLUMN "address_city" varchar;
  ALTER TABLE "contacts" ADD COLUMN "address_region" varchar;
  ALTER TABLE "contacts" ADD COLUMN "address_country_code" varchar;
  ALTER TABLE "contacts" ADD COLUMN "external_reference" varchar;
  CREATE INDEX "contacts_kind_idx" ON "contacts" USING btree ("kind");
  CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");
  CREATE INDEX "contacts_archived_at_idx" ON "contacts" USING btree ("archived_at");
  CREATE INDEX "contacts_display_name_idx" ON "contacts" USING btree ("display_name");
  CREATE INDEX "contacts_person_person_first_name_idx" ON "contacts" USING btree ("person_first_name");
  CREATE INDEX "contacts_person_person_last_name_idx" ON "contacts" USING btree ("person_last_name");
  CREATE INDEX "contacts_organization_details_organization_details_name_idx" ON "contacts" USING btree ("organization_details_name");
  CREATE INDEX "contacts_organization_details_organization_details_legal_idx" ON "contacts" USING btree ("organization_details_legal_name");
  CREATE INDEX "contacts_organization_details_organization_details_regis_idx" ON "contacts" USING btree ("organization_details_registration_number");
  CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");
  CREATE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");
  CREATE INDEX "contacts_address_address_postal_code_idx" ON "contacts" USING btree ("address_postal_code");
  CREATE INDEX "contacts_address_address_city_idx" ON "contacts" USING btree ("address_city");
  CREATE INDEX "contacts_external_reference_idx" ON "contacts" USING btree ("external_reference");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "contacts_kind_idx";
  DROP INDEX "contacts_status_idx";
  DROP INDEX "contacts_archived_at_idx";
  DROP INDEX "contacts_display_name_idx";
  DROP INDEX "contacts_person_person_first_name_idx";
  DROP INDEX "contacts_person_person_last_name_idx";
  DROP INDEX "contacts_organization_details_organization_details_name_idx";
  DROP INDEX "contacts_organization_details_organization_details_legal_idx";
  DROP INDEX "contacts_organization_details_organization_details_regis_idx";
  DROP INDEX "contacts_email_idx";
  DROP INDEX "contacts_phone_idx";
  DROP INDEX "contacts_address_address_postal_code_idx";
  DROP INDEX "contacts_address_address_city_idx";
  DROP INDEX "contacts_external_reference_idx";
  ALTER TABLE "contacts" DROP COLUMN "kind";
  ALTER TABLE "contacts" DROP COLUMN "status";
  ALTER TABLE "contacts" DROP COLUMN "archived_at";
  ALTER TABLE "contacts" DROP COLUMN "person_first_name";
  ALTER TABLE "contacts" DROP COLUMN "person_last_name";
  ALTER TABLE "contacts" DROP COLUMN "organization_details_name";
  ALTER TABLE "contacts" DROP COLUMN "organization_details_legal_name";
  ALTER TABLE "contacts" DROP COLUMN "organization_details_registration_number";
  ALTER TABLE "contacts" DROP COLUMN "organization_details_website";
  ALTER TABLE "contacts" DROP COLUMN "address_line1";
  ALTER TABLE "contacts" DROP COLUMN "address_line2";
  ALTER TABLE "contacts" DROP COLUMN "address_postal_code";
  ALTER TABLE "contacts" DROP COLUMN "address_city";
  ALTER TABLE "contacts" DROP COLUMN "address_region";
  ALTER TABLE "contacts" DROP COLUMN "address_country_code";
  ALTER TABLE "contacts" DROP COLUMN "external_reference";
  DROP TYPE "public"."enum_contacts_kind";
  DROP TYPE "public"."enum_contacts_status";`)
}
