import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tasks_status" AS ENUM('open', 'in-progress', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_tasks_priority" AS ENUM('low', 'normal', 'high', 'urgent');
  CREATE TABLE "tasks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"status" "enum_tasks_status" DEFAULT 'open' NOT NULL,
  	"priority" "enum_tasks_priority" DEFAULT 'normal' NOT NULL,
  	"due_at" timestamp(3) with time zone,
  	"remind_at" timestamp(3) with time zone,
  	"assignee_id" integer,
  	"title" varchar NOT NULL,
  	"details" jsonb,
  	"related_interaction_id" integer,
  	"completed_at" timestamp(3) with time zone,
  	"completed_by_id" integer,
  	"created_by_id" integer,
  	"external_reference" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tasks_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"contacts_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tasks_id" integer;
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_related_interaction_id_interactions_id_fk" FOREIGN KEY ("related_interaction_id") REFERENCES "public"."interactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tasks_rels" ADD CONSTRAINT "tasks_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tasks_rels" ADD CONSTRAINT "tasks_rels_contacts_fk" FOREIGN KEY ("contacts_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tasks_organization_idx" ON "tasks" USING btree ("organization_id");
  CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");
  CREATE INDEX "tasks_priority_idx" ON "tasks" USING btree ("priority");
  CREATE INDEX "tasks_due_at_idx" ON "tasks" USING btree ("due_at");
  CREATE INDEX "tasks_remind_at_idx" ON "tasks" USING btree ("remind_at");
  CREATE INDEX "tasks_assignee_idx" ON "tasks" USING btree ("assignee_id");
  CREATE INDEX "tasks_title_idx" ON "tasks" USING btree ("title");
  CREATE INDEX "tasks_related_interaction_idx" ON "tasks" USING btree ("related_interaction_id");
  CREATE INDEX "tasks_completed_at_idx" ON "tasks" USING btree ("completed_at");
  CREATE INDEX "tasks_completed_by_idx" ON "tasks" USING btree ("completed_by_id");
  CREATE INDEX "tasks_created_by_idx" ON "tasks" USING btree ("created_by_id");
  CREATE INDEX "tasks_external_reference_idx" ON "tasks" USING btree ("external_reference");
  CREATE INDEX "tasks_updated_at_idx" ON "tasks" USING btree ("updated_at");
  CREATE INDEX "tasks_created_at_idx" ON "tasks" USING btree ("created_at");
  CREATE INDEX "tasks_rels_order_idx" ON "tasks_rels" USING btree ("order");
  CREATE INDEX "tasks_rels_parent_idx" ON "tasks_rels" USING btree ("parent_id");
  CREATE INDEX "tasks_rels_path_idx" ON "tasks_rels" USING btree ("path");
  CREATE INDEX "tasks_rels_contacts_id_idx" ON "tasks_rels" USING btree ("contacts_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tasks_fk" FOREIGN KEY ("tasks_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_tasks_id_idx" ON "payload_locked_documents_rels" USING btree ("tasks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tasks_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "tasks" CASCADE;
  DROP TABLE "tasks_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tasks_fk";
  
  DROP INDEX "payload_locked_documents_rels_tasks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tasks_id";
  DROP TYPE "public"."enum_tasks_status";
  DROP TYPE "public"."enum_tasks_priority";`)
}
