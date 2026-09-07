import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'scheduled', 'cancelled', 'completed');
  CREATE TYPE "public"."enum_event_registrations_status" AS ENUM('pending', 'confirmed', 'waitlisted', 'cancelled', 'attended', 'no-show');
  CREATE TYPE "public"."enum_event_registrations_source" AS ENUM('manual', 'form', 'import', 'api', 'integration', 'other');
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"title" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"status" "enum_events_status" DEFAULT 'draft' NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone,
  	"timezone" varchar NOT NULL,
  	"capacity" numeric,
  	"location_name" varchar,
  	"location_address_line1" varchar,
  	"location_address_line2" varchar,
  	"location_postal_code" varchar,
  	"location_city" varchar,
  	"location_region" varchar,
  	"location_country" varchar,
  	"description" varchar,
  	"external_reference" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "events_date_order_check" CHECK ("ends_at" IS NULL OR "ends_at" >= "starts_at"),
  	CONSTRAINT "events_capacity_positive_integer_check" CHECK ("capacity" IS NULL OR ("capacity" >= 1 AND "capacity" = trunc("capacity")))
  );
  
  CREATE TABLE "event_registrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"event_id" integer NOT NULL,
  	"contact_id" integer NOT NULL,
  	"status" "enum_event_registrations_status" DEFAULT 'pending' NOT NULL,
  	"source" "enum_event_registrations_source" DEFAULT 'manual' NOT NULL,
  	"external_reference" varchar,
  	"note" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_registrations_id" integer;
  ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "events_organization_idx" ON "events" USING btree ("organization_id");
  CREATE INDEX "events_title_idx" ON "events" USING btree ("title");
  CREATE INDEX "events_key_idx" ON "events" USING btree ("key");
  CREATE UNIQUE INDEX "events_organization_key_unique" ON "events" USING btree ("organization_id", "key");
  CREATE INDEX "events_status_idx" ON "events" USING btree ("status");
  CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");
  CREATE INDEX "events_ends_at_idx" ON "events" USING btree ("ends_at");
  CREATE INDEX "events_timezone_idx" ON "events" USING btree ("timezone");
  CREATE INDEX "events_capacity_idx" ON "events" USING btree ("capacity");
  CREATE INDEX "events_external_reference_idx" ON "events" USING btree ("external_reference");
  CREATE INDEX "events_created_by_idx" ON "events" USING btree ("created_by_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "event_registrations_organization_idx" ON "event_registrations" USING btree ("organization_id");
  CREATE INDEX "event_registrations_event_idx" ON "event_registrations" USING btree ("event_id");
  CREATE INDEX "event_registrations_contact_idx" ON "event_registrations" USING btree ("contact_id");
  CREATE UNIQUE INDEX "event_registrations_organization_event_contact_unique" ON "event_registrations" USING btree ("organization_id", "event_id", "contact_id");
  CREATE INDEX "event_registrations_status_idx" ON "event_registrations" USING btree ("status");
  CREATE INDEX "event_registrations_source_idx" ON "event_registrations" USING btree ("source");
  CREATE INDEX "event_registrations_external_reference_idx" ON "event_registrations" USING btree ("external_reference");
  CREATE INDEX "event_registrations_created_by_idx" ON "event_registrations" USING btree ("created_by_id");
  CREATE INDEX "event_registrations_updated_at_idx" ON "event_registrations" USING btree ("updated_at");
  CREATE INDEX "event_registrations_created_at_idx" ON "event_registrations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_registrations_fk" FOREIGN KEY ("event_registrations_id") REFERENCES "public"."event_registrations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_event_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("event_registrations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_event_registrations_fk";
  DROP INDEX "payload_locked_documents_rels_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_event_registrations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "event_registrations_id";
  ALTER TABLE "event_registrations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "event_registrations" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum_event_registrations_status";
  DROP TYPE "public"."enum_event_registrations_source";`)
}
