import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "notes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"subject" varchar,
  	"contact_id" integer NOT NULL,
  	"body" varchar NOT NULL,
  	"pinned" boolean DEFAULT false,
  	"occurred_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "notes_id" integer;
  ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notes" ADD CONSTRAINT "notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "notes_organization_idx" ON "notes" USING btree ("organization_id");
  CREATE INDEX "notes_subject_idx" ON "notes" USING btree ("subject");
  CREATE INDEX "notes_contact_idx" ON "notes" USING btree ("contact_id");
  CREATE INDEX "notes_pinned_idx" ON "notes" USING btree ("pinned");
  CREATE INDEX "notes_occurred_at_idx" ON "notes" USING btree ("occurred_at");
  CREATE INDEX "notes_created_by_idx" ON "notes" USING btree ("created_by_id");
  CREATE INDEX "notes_updated_at_idx" ON "notes" USING btree ("updated_at");
  CREATE INDEX "notes_created_at_idx" ON "notes" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notes_fk" FOREIGN KEY ("notes_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_notes_id_idx" ON "payload_locked_documents_rels" USING btree ("notes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "notes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "notes" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_notes_fk";
  
  DROP INDEX "payload_locked_documents_rels_notes_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "notes_id";`)
}
