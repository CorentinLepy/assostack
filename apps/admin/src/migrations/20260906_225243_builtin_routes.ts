import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_organizations_settings_website_navigation_route" AS ENUM('news');
  CREATE TYPE "public"."enum_pages_blocks_hero_action_route" AS ENUM('news');
  CREATE TYPE "public"."enum_pages_blocks_callout_action_route" AS ENUM('news');
  CREATE TYPE "public"."enum_pages_blocks_cards_items_action_route" AS ENUM('news');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_action_route" AS ENUM('news');
  CREATE TYPE "public"."enum__pages_v_blocks_callout_action_route" AS ENUM('news');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_items_action_route" AS ENUM('news');
  ALTER TYPE "public"."enum_organizations_settings_website_navigation_kind" ADD VALUE 'route' BEFORE 'external';
  ALTER TYPE "public"."enum_pages_blocks_hero_action_kind" ADD VALUE 'route' BEFORE 'external';
  ALTER TYPE "public"."enum_pages_blocks_callout_action_kind" ADD VALUE 'route' BEFORE 'external';
  ALTER TYPE "public"."enum_pages_blocks_cards_items_action_kind" ADD VALUE 'route' BEFORE 'external';
  ALTER TYPE "public"."enum__pages_v_blocks_hero_action_kind" ADD VALUE 'route' BEFORE 'external';
  ALTER TYPE "public"."enum__pages_v_blocks_callout_action_kind" ADD VALUE 'route' BEFORE 'external';
  ALTER TYPE "public"."enum__pages_v_blocks_cards_items_action_kind" ADD VALUE 'route' BEFORE 'external';
  ALTER TABLE "organizations_settings_website_navigation" ADD COLUMN "route" "enum_organizations_settings_website_navigation_route";
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "action_route" "enum_pages_blocks_hero_action_route";
  ALTER TABLE "pages_blocks_callout" ADD COLUMN "action_route" "enum_pages_blocks_callout_action_route";
  ALTER TABLE "pages_blocks_cards_items" ADD COLUMN "action_route" "enum_pages_blocks_cards_items_action_route";
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "action_route" "enum__pages_v_blocks_hero_action_route";
  ALTER TABLE "_pages_v_blocks_callout" ADD COLUMN "action_route" "enum__pages_v_blocks_callout_action_route";
  ALTER TABLE "_pages_v_blocks_cards_items" ADD COLUMN "action_route" "enum__pages_v_blocks_cards_items_action_route";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organizations_settings_website_navigation" ALTER COLUMN "kind" SET DATA TYPE text;
  ALTER TABLE "organizations_settings_website_navigation" ALTER COLUMN "kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum_organizations_settings_website_navigation_kind";
  CREATE TYPE "public"."enum_organizations_settings_website_navigation_kind" AS ENUM('page', 'external');
  ALTER TABLE "organizations_settings_website_navigation" ALTER COLUMN "kind" SET DEFAULT 'page'::"public"."enum_organizations_settings_website_navigation_kind";
  ALTER TABLE "organizations_settings_website_navigation" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_organizations_settings_website_navigation_kind" USING "kind"::"public"."enum_organizations_settings_website_navigation_kind";
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "action_kind" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "action_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum_pages_blocks_hero_action_kind";
  CREATE TYPE "public"."enum_pages_blocks_hero_action_kind" AS ENUM('page', 'external');
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "action_kind" SET DEFAULT 'page'::"public"."enum_pages_blocks_hero_action_kind";
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "action_kind" SET DATA TYPE "public"."enum_pages_blocks_hero_action_kind" USING "action_kind"::"public"."enum_pages_blocks_hero_action_kind";
  ALTER TABLE "pages_blocks_callout" ALTER COLUMN "action_kind" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_callout" ALTER COLUMN "action_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum_pages_blocks_callout_action_kind";
  CREATE TYPE "public"."enum_pages_blocks_callout_action_kind" AS ENUM('page', 'external');
  ALTER TABLE "pages_blocks_callout" ALTER COLUMN "action_kind" SET DEFAULT 'page'::"public"."enum_pages_blocks_callout_action_kind";
  ALTER TABLE "pages_blocks_callout" ALTER COLUMN "action_kind" SET DATA TYPE "public"."enum_pages_blocks_callout_action_kind" USING "action_kind"::"public"."enum_pages_blocks_callout_action_kind";
  ALTER TABLE "pages_blocks_cards_items" ALTER COLUMN "action_kind" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_cards_items" ALTER COLUMN "action_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum_pages_blocks_cards_items_action_kind";
  CREATE TYPE "public"."enum_pages_blocks_cards_items_action_kind" AS ENUM('page', 'external');
  ALTER TABLE "pages_blocks_cards_items" ALTER COLUMN "action_kind" SET DEFAULT 'page'::"public"."enum_pages_blocks_cards_items_action_kind";
  ALTER TABLE "pages_blocks_cards_items" ALTER COLUMN "action_kind" SET DATA TYPE "public"."enum_pages_blocks_cards_items_action_kind" USING "action_kind"::"public"."enum_pages_blocks_cards_items_action_kind";
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "action_kind" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "action_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum__pages_v_blocks_hero_action_kind";
  CREATE TYPE "public"."enum__pages_v_blocks_hero_action_kind" AS ENUM('page', 'external');
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "action_kind" SET DEFAULT 'page'::"public"."enum__pages_v_blocks_hero_action_kind";
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "action_kind" SET DATA TYPE "public"."enum__pages_v_blocks_hero_action_kind" USING "action_kind"::"public"."enum__pages_v_blocks_hero_action_kind";
  ALTER TABLE "_pages_v_blocks_callout" ALTER COLUMN "action_kind" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_callout" ALTER COLUMN "action_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum__pages_v_blocks_callout_action_kind";
  CREATE TYPE "public"."enum__pages_v_blocks_callout_action_kind" AS ENUM('page', 'external');
  ALTER TABLE "_pages_v_blocks_callout" ALTER COLUMN "action_kind" SET DEFAULT 'page'::"public"."enum__pages_v_blocks_callout_action_kind";
  ALTER TABLE "_pages_v_blocks_callout" ALTER COLUMN "action_kind" SET DATA TYPE "public"."enum__pages_v_blocks_callout_action_kind" USING "action_kind"::"public"."enum__pages_v_blocks_callout_action_kind";
  ALTER TABLE "_pages_v_blocks_cards_items" ALTER COLUMN "action_kind" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_cards_items" ALTER COLUMN "action_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum__pages_v_blocks_cards_items_action_kind";
  CREATE TYPE "public"."enum__pages_v_blocks_cards_items_action_kind" AS ENUM('page', 'external');
  ALTER TABLE "_pages_v_blocks_cards_items" ALTER COLUMN "action_kind" SET DEFAULT 'page'::"public"."enum__pages_v_blocks_cards_items_action_kind";
  ALTER TABLE "_pages_v_blocks_cards_items" ALTER COLUMN "action_kind" SET DATA TYPE "public"."enum__pages_v_blocks_cards_items_action_kind" USING "action_kind"::"public"."enum__pages_v_blocks_cards_items_action_kind";
  ALTER TABLE "organizations_settings_website_navigation" DROP COLUMN "route";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "action_route";
  ALTER TABLE "pages_blocks_callout" DROP COLUMN "action_route";
  ALTER TABLE "pages_blocks_cards_items" DROP COLUMN "action_route";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "action_route";
  ALTER TABLE "_pages_v_blocks_callout" DROP COLUMN "action_route";
  ALTER TABLE "_pages_v_blocks_cards_items" DROP COLUMN "action_route";
  DROP TYPE "public"."enum_organizations_settings_website_navigation_route";
  DROP TYPE "public"."enum_pages_blocks_hero_action_route";
  DROP TYPE "public"."enum_pages_blocks_callout_action_route";
  DROP TYPE "public"."enum_pages_blocks_cards_items_action_route";
  DROP TYPE "public"."enum__pages_v_blocks_hero_action_route";
  DROP TYPE "public"."enum__pages_v_blocks_callout_action_route";
  DROP TYPE "public"."enum__pages_v_blocks_cards_items_action_route";`)
}
