import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_partnership_levels_status" AS ENUM('active', 'archived');
  CREATE TYPE "public"."enum_partnerships_kind" AS ENUM('sponsor', 'partner', 'supplier', 'institutional', 'media', 'other');
  CREATE TYPE "public"."enum_partnerships_status" AS ENUM('prospect', 'negotiating', 'active', 'paused', 'ended', 'declined');
  CREATE TABLE "partnership_levels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"name" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"status" "enum_partnership_levels_status" DEFAULT 'active' NOT NULL,
  	"archived_at" timestamp(3) with time zone,
  	"sort_order" numeric,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "partnerships" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"name" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"partner_id" integer NOT NULL,
  	"primary_contact_id" integer,
  	"level_id" integer,
  	"kind" "enum_partnerships_kind" DEFAULT 'partner' NOT NULL,
  	"status" "enum_partnerships_status" DEFAULT 'prospect' NOT NULL,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"agreement_reference" varchar,
  	"external_reference" varchar,
  	"note" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "partnerships_dates_check" CHECK ("starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" >= "starts_at")
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "partnership_levels_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "partnerships_id" integer;
  ALTER TABLE "partnership_levels" ADD CONSTRAINT "partnership_levels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_partner_id_contacts_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_primary_contact_id_contacts_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_level_id_partnership_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."partnership_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "partnership_levels_organization_idx" ON "partnership_levels" USING btree ("organization_id");
  CREATE INDEX "partnership_levels_name_idx" ON "partnership_levels" USING btree ("name");
  CREATE INDEX "partnership_levels_key_idx" ON "partnership_levels" USING btree ("key");
  CREATE UNIQUE INDEX "partnership_levels_organization_key_unique" ON "partnership_levels" USING btree ("organization_id", "key");
  CREATE INDEX "partnership_levels_status_idx" ON "partnership_levels" USING btree ("status");
  CREATE INDEX "partnership_levels_archived_at_idx" ON "partnership_levels" USING btree ("archived_at");
  CREATE INDEX "partnership_levels_sort_order_idx" ON "partnership_levels" USING btree ("sort_order");
  CREATE INDEX "partnership_levels_updated_at_idx" ON "partnership_levels" USING btree ("updated_at");
  CREATE INDEX "partnership_levels_created_at_idx" ON "partnership_levels" USING btree ("created_at");
  CREATE INDEX "partnerships_organization_idx" ON "partnerships" USING btree ("organization_id");
  CREATE INDEX "partnerships_name_idx" ON "partnerships" USING btree ("name");
  CREATE INDEX "partnerships_key_idx" ON "partnerships" USING btree ("key");
  CREATE UNIQUE INDEX "partnerships_organization_key_unique" ON "partnerships" USING btree ("organization_id", "key");
  CREATE INDEX "partnerships_partner_idx" ON "partnerships" USING btree ("partner_id");
  CREATE INDEX "partnerships_primary_contact_idx" ON "partnerships" USING btree ("primary_contact_id");
  CREATE INDEX "partnerships_level_idx" ON "partnerships" USING btree ("level_id");
  CREATE INDEX "partnerships_kind_idx" ON "partnerships" USING btree ("kind");
  CREATE INDEX "partnerships_status_idx" ON "partnerships" USING btree ("status");
  CREATE INDEX "partnerships_starts_at_idx" ON "partnerships" USING btree ("starts_at");
  CREATE INDEX "partnerships_ends_at_idx" ON "partnerships" USING btree ("ends_at");
  CREATE INDEX "partnerships_agreement_reference_idx" ON "partnerships" USING btree ("agreement_reference");
  CREATE INDEX "partnerships_external_reference_idx" ON "partnerships" USING btree ("external_reference");
  CREATE INDEX "partnerships_created_by_idx" ON "partnerships" USING btree ("created_by_id");
  CREATE INDEX "partnerships_updated_at_idx" ON "partnerships" USING btree ("updated_at");
  CREATE INDEX "partnerships_created_at_idx" ON "partnerships" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partnership_levels_fk" FOREIGN KEY ("partnership_levels_id") REFERENCES "public"."partnership_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partnerships_fk" FOREIGN KEY ("partnerships_id") REFERENCES "public"."partnerships"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_partnership_levels_id_idx" ON "payload_locked_documents_rels" USING btree ("partnership_levels_id");
  CREATE INDEX "payload_locked_documents_rels_partnerships_id_idx" ON "payload_locked_documents_rels" USING btree ("partnerships_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_partnership_levels_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_partnerships_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_partnership_levels_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_partnerships_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "partnership_levels_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "partnerships_id";
  ALTER TABLE "partnership_levels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "partnerships" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "partnerships" CASCADE;
  DROP TABLE "partnership_levels" CASCADE;
  DROP TYPE "public"."enum_partnership_levels_status";
  DROP TYPE "public"."enum_partnerships_kind";
  DROP TYPE "public"."enum_partnerships_status";`)
}
