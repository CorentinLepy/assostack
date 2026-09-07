import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_privacy_purposes_legal_basis" AS ENUM('consent', 'contract', 'legal-obligation', 'vital-interests', 'public-task', 'legitimate-interests', 'other');
  CREATE TYPE "public"."enum_privacy_purposes_status" AS ENUM('active', 'archived');
  CREATE TYPE "public"."enum_privacy_records_event_type" AS ENUM('granted', 'withdrawn', 'denied', 'basis-recorded');
  CREATE TYPE "public"."enum_privacy_records_source" AS ENUM('manual', 'form', 'import', 'api', 'integration', 'other');
  CREATE TABLE "privacy_purposes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"name" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"legal_basis" "enum_privacy_purposes_legal_basis" NOT NULL,
  	"status" "enum_privacy_purposes_status" DEFAULT 'active' NOT NULL,
  	"archived_at" timestamp(3) with time zone,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "privacy_records" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"contact_id" integer NOT NULL,
  	"purpose_id" integer NOT NULL,
  	"event_type" "enum_privacy_records_event_type" NOT NULL,
  	"effective_at" timestamp(3) with time zone NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"source" "enum_privacy_records_source" DEFAULT 'manual' NOT NULL,
  	"external_reference" varchar,
  	"note" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "privacy_purposes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "privacy_records_id" integer;
  ALTER TABLE "privacy_purposes" ADD CONSTRAINT "privacy_purposes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "privacy_records" ADD CONSTRAINT "privacy_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "privacy_records" ADD CONSTRAINT "privacy_records_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "privacy_records" ADD CONSTRAINT "privacy_records_purpose_id_privacy_purposes_id_fk" FOREIGN KEY ("purpose_id") REFERENCES "public"."privacy_purposes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "privacy_records" ADD CONSTRAINT "privacy_records_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "privacy_purposes_organization_idx" ON "privacy_purposes" USING btree ("organization_id");
  CREATE INDEX "privacy_purposes_name_idx" ON "privacy_purposes" USING btree ("name");
  CREATE INDEX "privacy_purposes_key_idx" ON "privacy_purposes" USING btree ("key");
  CREATE INDEX "privacy_purposes_legal_basis_idx" ON "privacy_purposes" USING btree ("legal_basis");
  CREATE INDEX "privacy_purposes_status_idx" ON "privacy_purposes" USING btree ("status");
  CREATE INDEX "privacy_purposes_archived_at_idx" ON "privacy_purposes" USING btree ("archived_at");
  CREATE INDEX "privacy_purposes_updated_at_idx" ON "privacy_purposes" USING btree ("updated_at");
  CREATE INDEX "privacy_purposes_created_at_idx" ON "privacy_purposes" USING btree ("created_at");
  CREATE INDEX "privacy_records_organization_idx" ON "privacy_records" USING btree ("organization_id");
  CREATE INDEX "privacy_records_contact_idx" ON "privacy_records" USING btree ("contact_id");
  CREATE INDEX "privacy_records_purpose_idx" ON "privacy_records" USING btree ("purpose_id");
  CREATE INDEX "privacy_records_event_type_idx" ON "privacy_records" USING btree ("event_type");
  CREATE INDEX "privacy_records_effective_at_idx" ON "privacy_records" USING btree ("effective_at");
  CREATE INDEX "privacy_records_expires_at_idx" ON "privacy_records" USING btree ("expires_at");
  CREATE INDEX "privacy_records_source_idx" ON "privacy_records" USING btree ("source");
  CREATE INDEX "privacy_records_external_reference_idx" ON "privacy_records" USING btree ("external_reference");
  CREATE INDEX "privacy_records_created_by_idx" ON "privacy_records" USING btree ("created_by_id");
  CREATE INDEX "privacy_records_updated_at_idx" ON "privacy_records" USING btree ("updated_at");
  CREATE INDEX "privacy_records_created_at_idx" ON "privacy_records" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_privacy_purposes_fk" FOREIGN KEY ("privacy_purposes_id") REFERENCES "public"."privacy_purposes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_privacy_records_fk" FOREIGN KEY ("privacy_records_id") REFERENCES "public"."privacy_records"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_privacy_purposes_id_idx" ON "payload_locked_documents_rels" USING btree ("privacy_purposes_id");
  CREATE INDEX "payload_locked_documents_rels_privacy_records_id_idx" ON "payload_locked_documents_rels" USING btree ("privacy_records_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "privacy_purposes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "privacy_records" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "privacy_purposes" CASCADE;
  DROP TABLE "privacy_records" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_privacy_purposes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_privacy_records_fk";
  
  DROP INDEX "payload_locked_documents_rels_privacy_purposes_id_idx";
  DROP INDEX "payload_locked_documents_rels_privacy_records_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "privacy_purposes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "privacy_records_id";
  DROP TYPE "public"."enum_privacy_purposes_legal_basis";
  DROP TYPE "public"."enum_privacy_purposes_status";
  DROP TYPE "public"."enum_privacy_records_event_type";
  DROP TYPE "public"."enum_privacy_records_source";`)
}
