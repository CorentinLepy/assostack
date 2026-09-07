import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_volunteer_shifts_status" AS ENUM('draft', 'open', 'closed', 'cancelled', 'completed');
  CREATE TYPE "public"."enum_volunteer_assignments_status" AS ENUM('invited', 'confirmed', 'cancelled', 'completed', 'no-show');
  CREATE TYPE "public"."enum_volunteer_assignments_source" AS ENUM('manual', 'form', 'import', 'api', 'integration', 'other');
  CREATE TABLE "volunteer_shifts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"event_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"status" "enum_volunteer_shifts_status" DEFAULT 'draft' NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone NOT NULL,
  	"capacity" numeric,
  	"location_name" varchar,
  	"instructions" varchar,
  	"external_reference" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "volunteer_assignments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"shift_id" integer NOT NULL,
  	"contact_id" integer NOT NULL,
  	"status" "enum_volunteer_assignments_status" DEFAULT 'invited' NOT NULL,
  	"source" "enum_volunteer_assignments_source" DEFAULT 'manual' NOT NULL,
  	"external_reference" varchar,
  	"note" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "volunteer_shifts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "volunteer_assignments_id" integer;
  ALTER TABLE "volunteer_shifts" ADD CONSTRAINT "volunteer_shifts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "volunteer_shifts" ADD CONSTRAINT "volunteer_shifts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "volunteer_shifts" ADD CONSTRAINT "volunteer_shifts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_shift_id_volunteer_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."volunteer_shifts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "volunteer_shifts_organization_idx" ON "volunteer_shifts" USING btree ("organization_id");
  CREATE INDEX "volunteer_shifts_event_idx" ON "volunteer_shifts" USING btree ("event_id");
  CREATE INDEX "volunteer_shifts_name_idx" ON "volunteer_shifts" USING btree ("name");
  CREATE INDEX "volunteer_shifts_key_idx" ON "volunteer_shifts" USING btree ("key");
  CREATE INDEX "volunteer_shifts_status_idx" ON "volunteer_shifts" USING btree ("status");
  CREATE INDEX "volunteer_shifts_starts_at_idx" ON "volunteer_shifts" USING btree ("starts_at");
  CREATE INDEX "volunteer_shifts_ends_at_idx" ON "volunteer_shifts" USING btree ("ends_at");
  CREATE INDEX "volunteer_shifts_capacity_idx" ON "volunteer_shifts" USING btree ("capacity");
  CREATE INDEX "volunteer_shifts_external_reference_idx" ON "volunteer_shifts" USING btree ("external_reference");
  CREATE INDEX "volunteer_shifts_created_by_idx" ON "volunteer_shifts" USING btree ("created_by_id");
  CREATE INDEX "volunteer_shifts_updated_at_idx" ON "volunteer_shifts" USING btree ("updated_at");
  CREATE INDEX "volunteer_shifts_created_at_idx" ON "volunteer_shifts" USING btree ("created_at");
  CREATE INDEX "volunteer_assignments_organization_idx" ON "volunteer_assignments" USING btree ("organization_id");
  CREATE INDEX "volunteer_assignments_shift_idx" ON "volunteer_assignments" USING btree ("shift_id");
  CREATE INDEX "volunteer_assignments_contact_idx" ON "volunteer_assignments" USING btree ("contact_id");
  CREATE INDEX "volunteer_assignments_status_idx" ON "volunteer_assignments" USING btree ("status");
  CREATE INDEX "volunteer_assignments_source_idx" ON "volunteer_assignments" USING btree ("source");
  CREATE INDEX "volunteer_assignments_external_reference_idx" ON "volunteer_assignments" USING btree ("external_reference");
  CREATE INDEX "volunteer_assignments_created_by_idx" ON "volunteer_assignments" USING btree ("created_by_id");
  CREATE INDEX "volunteer_assignments_updated_at_idx" ON "volunteer_assignments" USING btree ("updated_at");
  CREATE INDEX "volunteer_assignments_created_at_idx" ON "volunteer_assignments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_volunteer_shifts_fk" FOREIGN KEY ("volunteer_shifts_id") REFERENCES "public"."volunteer_shifts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_volunteer_assignments_fk" FOREIGN KEY ("volunteer_assignments_id") REFERENCES "public"."volunteer_assignments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_volunteer_shifts_id_idx" ON "payload_locked_documents_rels" USING btree ("volunteer_shifts_id");
  CREATE INDEX "payload_locked_documents_rels_volunteer_assignments_id_idx" ON "payload_locked_documents_rels" USING btree ("volunteer_assignments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "volunteer_shifts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "volunteer_assignments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "volunteer_shifts" CASCADE;
  DROP TABLE "volunteer_assignments" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_volunteer_shifts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_volunteer_assignments_fk";
  
  DROP INDEX "payload_locked_documents_rels_volunteer_shifts_id_idx";
  DROP INDEX "payload_locked_documents_rels_volunteer_assignments_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "volunteer_shifts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "volunteer_assignments_id";
  DROP TYPE "public"."enum_volunteer_shifts_status";
  DROP TYPE "public"."enum_volunteer_assignments_status";
  DROP TYPE "public"."enum_volunteer_assignments_source";`)
}
