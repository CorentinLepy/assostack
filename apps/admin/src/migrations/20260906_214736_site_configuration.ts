import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_organizations_settings_website_navigation_kind" AS ENUM('page', 'external');
  CREATE TYPE "public"."enum_organizations_settings_website_navigation_mode" AS ENUM('automatic', 'manual');
  CREATE TYPE "public"."enum_organizations_settings_website_theme_font_family" AS ENUM('system', 'humanist', 'serif', 'mono');
  CREATE TYPE "public"."enum_organizations_settings_website_theme_radius" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TABLE "organizations_settings_website_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_organizations_settings_website_navigation_kind" DEFAULT 'page',
  	"page_id" integer,
  	"url" varchar,
  	"new_tab" boolean DEFAULT false
  );
  
  ALTER TABLE "organizations" ADD COLUMN "settings_website_site_title" varchar;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_tagline" varchar;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_logo_id" integer;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_navigation_mode" "enum_organizations_settings_website_navigation_mode" DEFAULT 'automatic' NOT NULL;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_theme_primary_color" varchar;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_theme_accent_color" varchar;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_theme_background_color" varchar;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_theme_surface_color" varchar;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_theme_text_color" varchar;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_theme_muted_color" varchar;
  ALTER TABLE "organizations" ADD COLUMN "settings_website_theme_font_family" "enum_organizations_settings_website_theme_font_family" DEFAULT 'system';
  ALTER TABLE "organizations" ADD COLUMN "settings_website_theme_radius" "enum_organizations_settings_website_theme_radius" DEFAULT 'medium';
  ALTER TABLE "organizations_settings_website_navigation" ADD CONSTRAINT "organizations_settings_website_navigation_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "organizations_settings_website_navigation" ADD CONSTRAINT "organizations_settings_website_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "organizations_settings_website_navigation_order_idx" ON "organizations_settings_website_navigation" USING btree ("_order");
  CREATE INDEX "organizations_settings_website_navigation_parent_id_idx" ON "organizations_settings_website_navigation" USING btree ("_parent_id");
  CREATE INDEX "organizations_settings_website_navigation_page_idx" ON "organizations_settings_website_navigation" USING btree ("page_id");
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_settings_website_logo_id_media_id_fk" FOREIGN KEY ("settings_website_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "organizations_settings_website_settings_website_logo_idx" ON "organizations" USING btree ("settings_website_logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organizations_settings_website_navigation" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "organizations_settings_website_navigation" CASCADE;
  ALTER TABLE "organizations" DROP CONSTRAINT "organizations_settings_website_logo_id_media_id_fk";
  
  DROP INDEX "organizations_settings_website_settings_website_logo_idx";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_site_title";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_tagline";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_logo_id";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_navigation_mode";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_theme_primary_color";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_theme_accent_color";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_theme_background_color";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_theme_surface_color";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_theme_text_color";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_theme_muted_color";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_theme_font_family";
  ALTER TABLE "organizations" DROP COLUMN "settings_website_theme_radius";
  DROP TYPE "public"."enum_organizations_settings_website_navigation_kind";
  DROP TYPE "public"."enum_organizations_settings_website_navigation_mode";
  DROP TYPE "public"."enum_organizations_settings_website_theme_font_family";
  DROP TYPE "public"."enum_organizations_settings_website_theme_radius";`)
}
