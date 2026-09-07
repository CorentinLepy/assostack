import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_membership_types_status" AS ENUM('active', 'archived');
  CREATE TYPE "public"."enum_memberships_status" AS ENUM('pending', 'active', 'suspended', 'ended', 'cancelled');
  CREATE TABLE "membership_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"name" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"status" "enum_membership_types_status" DEFAULT 'active' NOT NULL,
  	"archived_at" timestamp(3) with time zone,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "memberships" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"contact_id" integer NOT NULL,
  	"membership_type_id" integer NOT NULL,
  	"status" "enum_memberships_status" DEFAULT 'pending' NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone,
  	"membership_number" varchar,
  	"external_reference" varchar,
  	"note" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "membership_types_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "memberships_id" integer;
  ALTER TABLE "membership_types" ADD CONSTRAINT "membership_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_membership_type_id_membership_types_id_fk" FOREIGN KEY ("membership_type_id") REFERENCES "public"."membership_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "membership_types_organization_idx" ON "membership_types" USING btree ("organization_id");
  CREATE INDEX "membership_types_name_idx" ON "membership_types" USING btree ("name");
  CREATE INDEX "membership_types_key_idx" ON "membership_types" USING btree ("key");
  CREATE INDEX "membership_types_status_idx" ON "membership_types" USING btree ("status");
  CREATE INDEX "membership_types_archived_at_idx" ON "membership_types" USING btree ("archived_at");
  CREATE INDEX "membership_types_updated_at_idx" ON "membership_types" USING btree ("updated_at");
  CREATE INDEX "membership_types_created_at_idx" ON "membership_types" USING btree ("created_at");
  CREATE INDEX "memberships_organization_idx" ON "memberships" USING btree ("organization_id");
  CREATE INDEX "memberships_contact_idx" ON "memberships" USING btree ("contact_id");
  CREATE INDEX "memberships_membership_type_idx" ON "memberships" USING btree ("membership_type_id");
  CREATE INDEX "memberships_status_idx" ON "memberships" USING btree ("status");
  CREATE INDEX "memberships_starts_at_idx" ON "memberships" USING btree ("starts_at");
  CREATE INDEX "memberships_ends_at_idx" ON "memberships" USING btree ("ends_at");
  CREATE INDEX "memberships_membership_number_idx" ON "memberships" USING btree ("membership_number");
  CREATE INDEX "memberships_external_reference_idx" ON "memberships" USING btree ("external_reference");
  CREATE INDEX "memberships_created_by_idx" ON "memberships" USING btree ("created_by_id");
  CREATE INDEX "memberships_updated_at_idx" ON "memberships" USING btree ("updated_at");
  CREATE INDEX "memberships_created_at_idx" ON "memberships" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_membership_types_fk" FOREIGN KEY ("membership_types_id") REFERENCES "public"."membership_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_memberships_fk" FOREIGN KEY ("memberships_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_membership_types_id_idx" ON "payload_locked_documents_rels" USING btree ("membership_types_id");
  CREATE INDEX "payload_locked_documents_rels_memberships_id_idx" ON "payload_locked_documents_rels" USING btree ("memberships_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "membership_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "memberships" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "membership_types" CASCADE;
  DROP TABLE "memberships" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_membership_types_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_memberships_fk";
  
  DROP INDEX "payload_locked_documents_rels_membership_types_id_idx";
  DROP INDEX "payload_locked_documents_rels_memberships_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "membership_types_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "memberships_id";
  DROP TYPE "public"."enum_membership_types_status";
  DROP TYPE "public"."enum_memberships_status";`)
}
