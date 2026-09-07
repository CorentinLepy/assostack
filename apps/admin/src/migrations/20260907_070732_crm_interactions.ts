import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_interactions_kind" AS ENUM('note', 'email', 'phone-call', 'meeting', 'other');
  CREATE TYPE "public"."enum_interactions_direction" AS ENUM('internal', 'inbound', 'outbound');
  CREATE TABLE "interactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"kind" "enum_interactions_kind" DEFAULT 'note' NOT NULL,
  	"direction" "enum_interactions_direction",
  	"occurred_at" timestamp(3) with time zone NOT NULL,
  	"subject" varchar NOT NULL,
  	"details" jsonb,
  	"created_by_id" integer,
  	"external_reference" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "interactions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"contacts_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "interactions_id" integer;
  ALTER TABLE "interactions" ADD CONSTRAINT "interactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "interactions" ADD CONSTRAINT "interactions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "interactions_rels" ADD CONSTRAINT "interactions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."interactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "interactions_rels" ADD CONSTRAINT "interactions_rels_contacts_fk" FOREIGN KEY ("contacts_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "interactions_organization_idx" ON "interactions" USING btree ("organization_id");
  CREATE INDEX "interactions_kind_idx" ON "interactions" USING btree ("kind");
  CREATE INDEX "interactions_direction_idx" ON "interactions" USING btree ("direction");
  CREATE INDEX "interactions_occurred_at_idx" ON "interactions" USING btree ("occurred_at");
  CREATE INDEX "interactions_subject_idx" ON "interactions" USING btree ("subject");
  CREATE INDEX "interactions_created_by_idx" ON "interactions" USING btree ("created_by_id");
  CREATE INDEX "interactions_external_reference_idx" ON "interactions" USING btree ("external_reference");
  CREATE INDEX "interactions_updated_at_idx" ON "interactions" USING btree ("updated_at");
  CREATE INDEX "interactions_created_at_idx" ON "interactions" USING btree ("created_at");
  CREATE INDEX "interactions_rels_order_idx" ON "interactions_rels" USING btree ("order");
  CREATE INDEX "interactions_rels_parent_idx" ON "interactions_rels" USING btree ("parent_id");
  CREATE INDEX "interactions_rels_path_idx" ON "interactions_rels" USING btree ("path");
  CREATE INDEX "interactions_rels_contacts_id_idx" ON "interactions_rels" USING btree ("contacts_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_interactions_fk" FOREIGN KEY ("interactions_id") REFERENCES "public"."interactions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_interactions_id_idx" ON "payload_locked_documents_rels" USING btree ("interactions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "interactions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "interactions_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "interactions" CASCADE;
  DROP TABLE "interactions_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_interactions_fk";
  
  DROP INDEX "payload_locked_documents_rels_interactions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "interactions_id";
  DROP TYPE "public"."enum_interactions_kind";
  DROP TYPE "public"."enum_interactions_direction";`)
}
