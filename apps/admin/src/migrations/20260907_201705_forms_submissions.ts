import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_forms_fields_type" AS ENUM('short-text', 'long-text', 'email', 'number', 'boolean', 'date', 'single-select', 'multi-select');
  CREATE TYPE "public"."enum_forms_status" AS ENUM('draft', 'active', 'archived');
  CREATE TYPE "public"."enum_form_submissions_values_field_type" AS ENUM('short-text', 'long-text', 'email', 'number', 'boolean', 'date', 'single-select', 'multi-select');
  CREATE TYPE "public"."enum_form_submissions_status" AS ENUM('received', 'reviewing', 'accepted', 'rejected', 'archived');
  CREATE TYPE "public"."enum_form_submissions_source" AS ENUM('manual', 'public-form', 'import', 'api', 'integration', 'other');
  CREATE TABLE "forms_fields_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "forms_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"type" "enum_forms_fields_type" NOT NULL,
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "forms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"title" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"status" "enum_forms_status" DEFAULT 'draft' NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "form_submissions_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field_key" varchar NOT NULL,
  	"field_label" varchar NOT NULL,
  	"field_type" "enum_form_submissions_values_field_type" NOT NULL,
  	"text_value" varchar,
  	"number_value" numeric,
  	"boolean_value" boolean,
  	"date_value" timestamp(3) with time zone,
  	"single_select_value" varchar
  );
  
  CREATE TABLE "form_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"form_id" integer NOT NULL,
  	"contact_id" integer,
  	"status" "enum_form_submissions_status" DEFAULT 'received' NOT NULL,
  	"source" "enum_form_submissions_source" DEFAULT 'manual' NOT NULL,
  	"submitted_at" timestamp(3) with time zone NOT NULL,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "form_submissions_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "forms_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "form_submissions_id" integer;
  ALTER TABLE "forms_fields_options" ADD CONSTRAINT "forms_fields_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_fields" ADD CONSTRAINT "forms_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms" ADD CONSTRAINT "forms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_submissions_values" ADD CONSTRAINT "form_submissions_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_submissions_texts" ADD CONSTRAINT "form_submissions_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "forms_fields_options_order_idx" ON "forms_fields_options" USING btree ("_order");
  CREATE INDEX "forms_fields_options_parent_id_idx" ON "forms_fields_options" USING btree ("_parent_id");
  CREATE INDEX "forms_fields_order_idx" ON "forms_fields" USING btree ("_order");
  CREATE INDEX "forms_fields_parent_id_idx" ON "forms_fields" USING btree ("_parent_id");
  CREATE INDEX "forms_organization_idx" ON "forms" USING btree ("organization_id");
  CREATE INDEX "forms_title_idx" ON "forms" USING btree ("title");
  CREATE UNIQUE INDEX "forms_organization_key_unique" ON "forms" USING btree ("organization_id","key");
  CREATE INDEX "forms_key_idx" ON "forms" USING btree ("key");
  CREATE INDEX "forms_status_idx" ON "forms" USING btree ("status");
  CREATE INDEX "forms_updated_at_idx" ON "forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "forms" USING btree ("created_at");
  CREATE INDEX "form_submissions_values_order_idx" ON "form_submissions_values" USING btree ("_order");
  CREATE INDEX "form_submissions_values_parent_id_idx" ON "form_submissions_values" USING btree ("_parent_id");
  CREATE INDEX "form_submissions_organization_idx" ON "form_submissions" USING btree ("organization_id");
  CREATE INDEX "form_submissions_form_idx" ON "form_submissions" USING btree ("form_id");
  CREATE INDEX "form_submissions_contact_idx" ON "form_submissions" USING btree ("contact_id");
  CREATE INDEX "form_submissions_status_idx" ON "form_submissions" USING btree ("status");
  CREATE INDEX "form_submissions_source_idx" ON "form_submissions" USING btree ("source");
  CREATE INDEX "form_submissions_submitted_at_idx" ON "form_submissions" USING btree ("submitted_at");
  CREATE INDEX "form_submissions_created_by_idx" ON "form_submissions" USING btree ("created_by_id");
  CREATE INDEX "form_submissions_updated_at_idx" ON "form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions" USING btree ("created_at");
  CREATE INDEX "form_submissions_texts_order_parent" ON "form_submissions_texts" USING btree ("order","parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload_locked_documents_rels" USING btree ("forms_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("form_submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_forms_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_submissions_fk";
  DROP INDEX "payload_locked_documents_rels_forms_id_idx";
  DROP INDEX "payload_locked_documents_rels_form_submissions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "forms_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "form_submissions_id";
  ALTER TABLE "forms_fields_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_submissions_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_submissions_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "forms_fields_options" CASCADE;
  DROP TABLE "forms_fields" CASCADE;
  DROP TABLE "forms" CASCADE;
  DROP TABLE "form_submissions_values" CASCADE;
  DROP TABLE "form_submissions" CASCADE;
  DROP TABLE "form_submissions_texts" CASCADE;
  DROP TYPE "public"."enum_forms_fields_type";
  DROP TYPE "public"."enum_forms_status";
  DROP TYPE "public"."enum_form_submissions_values_field_type";
  DROP TYPE "public"."enum_form_submissions_status";
  DROP TYPE "public"."enum_form_submissions_source";`)
}
