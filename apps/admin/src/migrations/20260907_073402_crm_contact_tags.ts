import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_contact_tags_status" AS ENUM('active', 'archived');
  CREATE TABLE "contact_tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_contact_tags_status" DEFAULT 'active' NOT NULL,
  	"archived_at" timestamp(3) with time zone,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contacts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"contact_tags_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contact_tags_id" integer;
  ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contacts_rels" ADD CONSTRAINT "contacts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts_rels" ADD CONSTRAINT "contacts_rels_contact_tags_fk" FOREIGN KEY ("contact_tags_id") REFERENCES "public"."contact_tags"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "contact_tags_organization_idx" ON "contact_tags" USING btree ("organization_id");
  CREATE INDEX "contact_tags_name_idx" ON "contact_tags" USING btree ("name");
  CREATE INDEX "contact_tags_slug_idx" ON "contact_tags" USING btree ("slug");
  CREATE UNIQUE INDEX "contact_tags_organization_slug_unique" ON "contact_tags" USING btree ("organization_id", "slug");
  CREATE INDEX "contact_tags_status_idx" ON "contact_tags" USING btree ("status");
  CREATE INDEX "contact_tags_archived_at_idx" ON "contact_tags" USING btree ("archived_at");
  CREATE INDEX "contact_tags_updated_at_idx" ON "contact_tags" USING btree ("updated_at");
  CREATE INDEX "contact_tags_created_at_idx" ON "contact_tags" USING btree ("created_at");
  CREATE INDEX "contacts_rels_order_idx" ON "contacts_rels" USING btree ("order");
  CREATE INDEX "contacts_rels_parent_idx" ON "contacts_rels" USING btree ("parent_id");
  CREATE INDEX "contacts_rels_path_idx" ON "contacts_rels" USING btree ("path");
  CREATE INDEX "contacts_rels_contact_tags_id_idx" ON "contacts_rels" USING btree ("contact_tags_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_tags_fk" FOREIGN KEY ("contact_tags_id") REFERENCES "public"."contact_tags"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_contact_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_tags_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_contact_tags_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_contact_tags_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "contact_tags_id";
  DROP TABLE IF EXISTS "contacts_rels" CASCADE;
  DROP TABLE IF EXISTS "contact_tags" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_contact_tags_status";`)
}
