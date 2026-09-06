import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_hero_alignment" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_pages_blocks_hero_action_kind" AS ENUM('page', 'external');
  CREATE TYPE "public"."enum_pages_blocks_callout_tone" AS ENUM('neutral', 'accent');
  CREATE TYPE "public"."enum_pages_blocks_callout_action_kind" AS ENUM('page', 'external');
  CREATE TYPE "public"."enum_pages_blocks_cards_items_action_kind" AS ENUM('page', 'external');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_alignment" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_action_kind" AS ENUM('page', 'external');
  CREATE TYPE "public"."enum__pages_v_blocks_callout_tone" AS ENUM('neutral', 'accent');
  CREATE TYPE "public"."enum__pages_v_blocks_callout_action_kind" AS ENUM('page', 'external');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_items_action_kind" AS ENUM('page', 'external');
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"alignment" "enum_pages_blocks_hero_alignment" DEFAULT 'left',
  	"action_label" varchar,
  	"action_kind" "enum_pages_blocks_hero_action_kind" DEFAULT 'page',
  	"action_page_id" integer,
  	"action_url" varchar,
  	"action_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"tone" "enum_pages_blocks_callout_tone" DEFAULT 'neutral',
  	"action_label" varchar,
  	"action_kind" "enum_pages_blocks_callout_action_kind" DEFAULT 'page',
  	"action_page_id" integer,
  	"action_url" varchar,
  	"action_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"action_label" varchar,
  	"action_kind" "enum_pages_blocks_cards_items_action_kind" DEFAULT 'page',
  	"action_page_id" integer,
  	"action_url" varchar,
  	"action_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"alignment" "enum__pages_v_blocks_hero_alignment" DEFAULT 'left',
  	"action_label" varchar,
  	"action_kind" "enum__pages_v_blocks_hero_action_kind" DEFAULT 'page',
  	"action_page_id" integer,
  	"action_url" varchar,
  	"action_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"tone" "enum__pages_v_blocks_callout_tone" DEFAULT 'neutral',
  	"action_label" varchar,
  	"action_kind" "enum__pages_v_blocks_callout_action_kind" DEFAULT 'page',
  	"action_page_id" integer,
  	"action_url" varchar,
  	"action_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"action_label" varchar,
  	"action_kind" "enum__pages_v_blocks_cards_items_action_kind" DEFAULT 'page',
  	"action_page_id" integer,
  	"action_url" varchar,
  	"action_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_action_page_id_pages_id_fk" FOREIGN KEY ("action_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_callout" ADD CONSTRAINT "pages_blocks_callout_action_page_id_pages_id_fk" FOREIGN KEY ("action_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_callout" ADD CONSTRAINT "pages_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_items" ADD CONSTRAINT "pages_blocks_cards_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_items" ADD CONSTRAINT "pages_blocks_cards_items_action_page_id_pages_id_fk" FOREIGN KEY ("action_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_items" ADD CONSTRAINT "pages_blocks_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards" ADD CONSTRAINT "pages_blocks_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_action_page_id_pages_id_fk" FOREIGN KEY ("action_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_callout" ADD CONSTRAINT "_pages_v_blocks_callout_action_page_id_pages_id_fk" FOREIGN KEY ("action_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_callout" ADD CONSTRAINT "_pages_v_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_items" ADD CONSTRAINT "_pages_v_blocks_cards_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_items" ADD CONSTRAINT "_pages_v_blocks_cards_items_action_page_id_pages_id_fk" FOREIGN KEY ("action_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_items" ADD CONSTRAINT "_pages_v_blocks_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards" ADD CONSTRAINT "_pages_v_blocks_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_image_idx" ON "pages_blocks_hero" USING btree ("image_id");
  CREATE INDEX "pages_blocks_hero_action_action_page_idx" ON "pages_blocks_hero" USING btree ("action_page_id");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_callout_order_idx" ON "pages_blocks_callout" USING btree ("_order");
  CREATE INDEX "pages_blocks_callout_parent_id_idx" ON "pages_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_callout_path_idx" ON "pages_blocks_callout" USING btree ("_path");
  CREATE INDEX "pages_blocks_callout_action_action_page_idx" ON "pages_blocks_callout" USING btree ("action_page_id");
  CREATE INDEX "pages_blocks_cards_items_order_idx" ON "pages_blocks_cards_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards_items_parent_id_idx" ON "pages_blocks_cards_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_items_image_idx" ON "pages_blocks_cards_items" USING btree ("image_id");
  CREATE INDEX "pages_blocks_cards_items_action_action_page_idx" ON "pages_blocks_cards_items" USING btree ("action_page_id");
  CREATE INDEX "pages_blocks_cards_order_idx" ON "pages_blocks_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards_parent_id_idx" ON "pages_blocks_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_path_idx" ON "pages_blocks_cards" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_image_idx" ON "_pages_v_blocks_hero" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_hero_action_action_page_idx" ON "_pages_v_blocks_hero" USING btree ("action_page_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_callout_order_idx" ON "_pages_v_blocks_callout" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_callout_parent_id_idx" ON "_pages_v_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_callout_path_idx" ON "_pages_v_blocks_callout" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_callout_action_action_page_idx" ON "_pages_v_blocks_callout" USING btree ("action_page_id");
  CREATE INDEX "_pages_v_blocks_cards_items_order_idx" ON "_pages_v_blocks_cards_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards_items_parent_id_idx" ON "_pages_v_blocks_cards_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_items_image_idx" ON "_pages_v_blocks_cards_items" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_cards_items_action_action_page_idx" ON "_pages_v_blocks_cards_items" USING btree ("action_page_id");
  CREATE INDEX "_pages_v_blocks_cards_order_idx" ON "_pages_v_blocks_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards_parent_id_idx" ON "_pages_v_blocks_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_path_idx" ON "_pages_v_blocks_cards" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_callout" CASCADE;
  DROP TABLE "pages_blocks_cards_items" CASCADE;
  DROP TABLE "pages_blocks_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_callout" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_items" CASCADE;
  DROP TABLE "_pages_v_blocks_cards" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_hero_alignment";
  DROP TYPE "public"."enum_pages_blocks_hero_action_kind";
  DROP TYPE "public"."enum_pages_blocks_callout_tone";
  DROP TYPE "public"."enum_pages_blocks_callout_action_kind";
  DROP TYPE "public"."enum_pages_blocks_cards_items_action_kind";
  DROP TYPE "public"."enum__pages_v_blocks_hero_alignment";
  DROP TYPE "public"."enum__pages_v_blocks_hero_action_kind";
  DROP TYPE "public"."enum__pages_v_blocks_callout_tone";
  DROP TYPE "public"."enum__pages_v_blocks_callout_action_kind";
  DROP TYPE "public"."enum__pages_v_blocks_cards_items_action_kind";`)
}
