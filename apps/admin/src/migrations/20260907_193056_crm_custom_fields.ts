import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_custom_field_definitions_type" AS ENUM('short-text', 'long-text', 'number', 'boolean', 'date', 'single-select', 'multi-select');
  CREATE TYPE "public"."enum_custom_field_definitions_status" AS ENUM('active', 'archived');
  CREATE TABLE "custom_field_definitions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "custom_field_definitions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"label" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"type" "enum_custom_field_definitions_type" NOT NULL,
  	"description" varchar,
  	"required" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"status" "enum_custom_field_definitions_status" DEFAULT 'active' NOT NULL,
  	"archived_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contact_custom_field_values" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"contact_id" integer NOT NULL,
  	"field_id" integer NOT NULL,
  	"text_value" varchar,
  	"number_value" numeric,
  	"boolean_value" boolean,
  	"date_value" timestamp(3) with time zone,
  	"single_select_value" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contact_custom_field_values_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "custom_field_definitions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contact_custom_field_values_id" integer;
  ALTER TABLE "custom_field_definitions_options" ADD CONSTRAINT "custom_field_definitions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."custom_field_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_custom_field_values" ADD CONSTRAINT "contact_custom_field_values_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_custom_field_values" ADD CONSTRAINT "contact_custom_field_values_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_custom_field_values" ADD CONSTRAINT "contact_custom_field_values_field_id_custom_field_definitions_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."custom_field_definitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_custom_field_values_texts" ADD CONSTRAINT "contact_custom_field_values_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."contact_custom_field_values"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "custom_field_definitions_options_order_idx" ON "custom_field_definitions_options" USING btree ("_order");
  CREATE INDEX "custom_field_definitions_options_parent_id_idx" ON "custom_field_definitions_options" USING btree ("_parent_id");
  CREATE INDEX "custom_field_definitions_organization_idx" ON "custom_field_definitions" USING btree ("organization_id");
  CREATE INDEX "custom_field_definitions_label_idx" ON "custom_field_definitions" USING btree ("label");
  CREATE INDEX "custom_field_definitions_key_idx" ON "custom_field_definitions" USING btree ("key");
  CREATE UNIQUE INDEX "custom_field_definitions_organization_key_unique" ON "custom_field_definitions" USING btree ("organization_id", "key");
  CREATE INDEX "custom_field_definitions_type_idx" ON "custom_field_definitions" USING btree ("type");
  CREATE INDEX "custom_field_definitions_sort_order_idx" ON "custom_field_definitions" USING btree ("sort_order");
  CREATE INDEX "custom_field_definitions_status_idx" ON "custom_field_definitions" USING btree ("status");
  CREATE INDEX "custom_field_definitions_archived_at_idx" ON "custom_field_definitions" USING btree ("archived_at");
  CREATE INDEX "custom_field_definitions_updated_at_idx" ON "custom_field_definitions" USING btree ("updated_at");
  CREATE INDEX "custom_field_definitions_created_at_idx" ON "custom_field_definitions" USING btree ("created_at");
  CREATE INDEX "contact_custom_field_values_organization_idx" ON "contact_custom_field_values" USING btree ("organization_id");
  CREATE INDEX "contact_custom_field_values_contact_idx" ON "contact_custom_field_values" USING btree ("contact_id");
  CREATE INDEX "contact_custom_field_values_field_idx" ON "contact_custom_field_values" USING btree ("field_id");
  CREATE UNIQUE INDEX "contact_custom_field_values_contact_field_unique" ON "contact_custom_field_values" USING btree ("contact_id", "field_id");
  CREATE INDEX "contact_custom_field_values_single_select_value_idx" ON "contact_custom_field_values" USING btree ("single_select_value");
  CREATE INDEX "contact_custom_field_values_updated_at_idx" ON "contact_custom_field_values" USING btree ("updated_at");
  CREATE INDEX "contact_custom_field_values_created_at_idx" ON "contact_custom_field_values" USING btree ("created_at");
  CREATE INDEX "contact_custom_field_values_texts_order_parent" ON "contact_custom_field_values_texts" USING btree ("order","parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_custom_field_definitions_fk" FOREIGN KEY ("custom_field_definitions_id") REFERENCES "public"."custom_field_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_custom_field_values_fk" FOREIGN KEY ("contact_custom_field_values_id") REFERENCES "public"."contact_custom_field_values"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_custom_field_definitions_i_idx" ON "payload_locked_documents_rels" USING btree ("custom_field_definitions_id");
  CREATE INDEX "payload_locked_documents_rels_contact_custom_field_value_idx" ON "payload_locked_documents_rels" USING btree ("contact_custom_field_values_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_custom_field_definitions_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contact_custom_field_values_fk";
  DROP INDEX "payload_locked_documents_rels_custom_field_definitions_i_idx";
  DROP INDEX "payload_locked_documents_rels_contact_custom_field_value_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "custom_field_definitions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contact_custom_field_values_id";
  DROP TABLE "custom_field_definitions_options" CASCADE;
  DROP TABLE "contact_custom_field_values_texts" CASCADE;
  DROP TABLE "contact_custom_field_values" CASCADE;
  DROP TABLE "custom_field_definitions" CASCADE;
  DROP TYPE "public"."enum_custom_field_definitions_type";
  DROP TYPE "public"."enum_custom_field_definitions_status";`)
}
