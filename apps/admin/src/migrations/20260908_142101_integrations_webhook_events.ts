import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "webhook_events" (
    "id" serial PRIMARY KEY NOT NULL,
    "organization_id" integer,
    "integration_id" integer NOT NULL,
    "event_id" varchar NOT NULL,
    "idempotency_key" varchar NOT NULL,
    "received_at" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "webhook_events_id" integer;
  ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "webhook_events_organization_idx" ON "webhook_events" USING btree ("organization_id");
  CREATE INDEX "webhook_events_integration_idx" ON "webhook_events" USING btree ("integration_id");
  CREATE UNIQUE INDEX "webhook_events_idempotency_key_idx" ON "webhook_events" USING btree ("idempotency_key");
  CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events" USING btree ("received_at");
  CREATE INDEX "webhook_events_updated_at_idx" ON "webhook_events" USING btree ("updated_at");
  CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webhook_events_fk" FOREIGN KEY ("webhook_events_id") REFERENCES "public"."webhook_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_webhook_events_id_idx" ON "payload_locked_documents_rels" USING btree ("webhook_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_webhook_events_fk";
  DROP INDEX "payload_locked_documents_rels_webhook_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "webhook_events_id";
  ALTER TABLE "webhook_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "webhook_events";`)
}
