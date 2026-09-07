import { sql } from '@payloadcms/db-postgres'
import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

describe('interaction schema diagnostic', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('prints the Payload-generated PostgreSQL shape for migration authoring', async () => {
    const columns = await payload.db.drizzle.execute(sql`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          table_name IN ('interactions', 'interactions_rels')
          OR (table_name = 'payload_locked_documents_rels' AND column_name LIKE '%interactions%')
        )
      ORDER BY table_name, ordinal_position
    `)

    const constraints = await payload.db.drizzle.execute(sql`
      SELECT
        con.conname AS name,
        rel.relname AS table_name,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND (
          rel.relname IN ('interactions', 'interactions_rels')
          OR con.conname LIKE '%interactions%'
        )
      ORDER BY rel.relname, con.conname
    `)

    const indexes = await payload.db.drizzle.execute(sql`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (
          tablename IN ('interactions', 'interactions_rels')
          OR indexname LIKE '%interactions%'
        )
      ORDER BY tablename, indexname
    `)

    const enums = await payload.db.drizzle.execute(sql`
      SELECT t.typname AS enum_name, e.enumlabel AS value, e.enumsortorder AS sort_order
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname LIKE 'enum_interactions%'
      ORDER BY t.typname, e.enumsortorder
    `)

    console.log('ASSOSTACK_INTERACTION_SCHEMA_DIAGNOSTIC=' + JSON.stringify({
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
      enums: enums.rows,
    }))

    expect(columns.rows.length).toBeGreaterThan(0)
  })
})
