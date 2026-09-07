import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_integrations_provider" AS ENUM('helloasso', 'brevo', 'smtp', 'cloudflare-r2', 'cloudflare-turnstile', 'webhook', 'automation');
  CREATE TYPE "public"."enum_integrations_status" AS ENUM('enabled', 'disabled');
  CREATE TABLE "integrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"name" varchar NOT NULL,
  	"provider" "enum_integrations_provider" NOT NULL,
  	"status" "enum_integrations_status" DEFAULT 'disabled' NOT NULL,
  	"config" jsonb NOT NULL,
  	"secret_ref" jsonb,
  	"last_success_at" timestamp(3) with time zone,
  	"last_failure_at" timestamp(3) with time zone,
  	"last_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "integrations_id" integer;
  ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "integrations_organization_idx" ON "integrations" USING btree ("organization_id");
  CREATE INDEX "integrations_provider_idx" ON "integrations" USING btree ("provider");
  CREATE INDEX "integrations_updated_at_idx" ON "integrations" USING btree ("updated_at");
  CREATE INDEX "integrations_created_at_idx" ON "integrations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_integrations_fk" FOREIGN KEY ("integrations_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_integrations_id_idx" ON "payload_locked_documents_rels" USING btree ("integrations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "integrations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "integrations" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_integrations_fk";
  
  DROP INDEX "payload_locked_documents_rels_integrations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "integrations_id";
  DROP TYPE "public"."enum_integrations_provider";
  DROP TYPE "public"."enum_integrations_status";`)
}
