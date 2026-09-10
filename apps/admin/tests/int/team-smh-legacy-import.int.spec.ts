import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { createLegacyImportPlan, executeLegacyImport, shouldRunTeamSMHImporter, type LegacyDatabase } from '../../src/scripts/team-smh-legacy-import'

const forbiddenTables = ['users', 'api_tokens', 'api_tokens_v2', 'audit_logs', 'security_logs', 'visit_stats', 'blocked_ips', 'rate_limits', 'push_subscriptions', 'push_notifications', 'messages', 'task_logs', 'role_permissions', 'change_history', 'deleted_items']

describe('Team SMH legacy importer', () => {
  let database: DatabaseSync
  let directory: string
  const statements: string[] = []

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'assostack-team-smh-'))
    database = new DatabaseSync(join(directory, 'legacy.sqlite'))
    database.exec(`
      CREATE TABLE settings (key TEXT, value TEXT);
      CREATE TABLE articles (id INTEGER, title TEXT, slug TEXT, body TEXT, published_at TEXT, seo_title TEXT, seo_description TEXT, status TEXT);
      CREATE TABLE pilots (id INTEGER, name TEXT, number TEXT, team_name TEXT, role TEXT, bio TEXT, city TEXT, palmares TEXT, experience TEXT, status TEXT);
      CREATE TABLE program_items (id INTEGER, title TEXT, day_label TEXT, start_time TEXT, end_time TEXT, description TEXT, state TEXT, sort_order INTEGER, status TEXT);
      CREATE TABLE visitor_cards (id INTEGER, title TEXT, body TEXT, url TEXT, sort_order INTEGER, status TEXT);
      CREATE TABLE map_points (id INTEGER, title TEXT, latitude TEXT, longitude TEXT, status TEXT);
      CREATE TABLE events (id INTEGER, title TEXT, event_date TEXT, location TEXT, status TEXT);
      INSERT INTO settings VALUES ('association_title', 'Association Team SMH'), ('hero_title', 'Volez avec nous'), ('visitor_center_title', 'Visiteurs'), ('facebook_url', 'https://facebook.com/team-smh'), ('seo_title', 'Team SMH SEO'), ('maintenance_title', 'Do not read');
      INSERT INTO articles VALUES (1, 'Bienvenue Team SMH', 'bienvenue-team-smh', '<p>Bonjour &amp; bienvenue.</p><script>ignored()</script>', '2026-06-01T10:00:00Z', 'Bienvenue SEO', 'Une introduction.', 'published');
      INSERT INTO pilots VALUES (1, 'Test', '0', '', '', '', '', '', '', 'published'), (2, 'Alice Martin', '12', 'SMH', 'Pilote', 'Bio publique', 'Annecy', 'Championne', '10 ans', 'published');
      INSERT INTO events VALUES (1, 'SMH CUP 2026', '2026-07-12', 'Annecy', 'published');
      INSERT INTO program_items VALUES (2, 'Finale', 'Dimanche', '14:00', '15:00', 'Course finale', 'Confirmé', 2, 'published'), (1, 'Essais', 'Samedi', '10:00', '11:00', 'Essais libres', 'Ouvert', 1, 'published');
      INSERT INTO map_points VALUES (1, 'Point de rendez-vous', '45.899', '6.129', 'published');
    `)
    for (let index = 1; index <= 6; index += 1) {
      database.prepare('INSERT INTO visitor_cards VALUES (?, ?, ?, ?, ?, ?)').run(index, `Carte ${index}`, `<p>Texte ${index}</p>`, `https://example.test/${index}`, index, 'published')
    }
  })

  afterAll(async () => {
    database.close()
    await rm(directory, { force: true, recursive: true })
  })

  const recordedDatabase: LegacyDatabase = {
    prepare: (sql) => {
      statements.push(sql)
      return database.prepare(sql) as unknown as { all: () => unknown[] }
    },
  }

  test('recognizes supported Payload CLI arguments without matching other processes', () => {
    expect(shouldRunTeamSMHImporter([
      'node',
      'payload/bin.js',
      'run',
      'src/scripts/team-smh-legacy-import.ts',
      '--',
      '--db',
      '/legacy/team_smh.sqlite',
    ])).toBe(true)
    expect(shouldRunTeamSMHImporter([
      '/usr/local/bin/node',
      '/app/node_modules/payload/bin.js',
      '--db',
      '/legacy/team_smh.sqlite',
      '--organization',
      'team-smh',
    ])).toBe(true)
    expect(shouldRunTeamSMHImporter([
      'node',
      'vitest.mjs',
      'run',
      'tests/int/team-smh-legacy-import.int.spec.ts',
    ])).toBe(false)
    expect(shouldRunTeamSMHImporter([
      'node',
      'scripts/other-importer.js',
      '--db',
      '/legacy/team_smh.sqlite',
      '--organization',
      'team-smh',
    ])).toBe(false)
    expect(shouldRunTeamSMHImporter([
      'node',
      'C:\\app\\node_modules\\payload\\bin.js',
      '--db',
      '/legacy/team_smh.sqlite',
      '--organization',
      'another-organization',
    ])).toBe(false)
    expect(shouldRunTeamSMHImporter([
      'node',
      '/app/node_modules/payload/bin.js',
      '--organization',
      'team-smh',
    ])).toBe(false)
    expect(shouldRunTeamSMHImporter([
      'node',
      '/app/node_modules/payload/bin.js',
      '--db',
      '--organization',
      'team-smh',
    ])).toBe(false)
    expect(shouldRunTeamSMHImporter([
      'node',
      '/app/node_modules/payload/bin.js',
      '--db',
      '/legacy/team_smh.sqlite',
    ])).toBe(false)
  })

  test('plans only allowlisted data deterministically and excludes test pilots', () => {
    statements.length = 0
    const first = createLegacyImportPlan(recordedDatabase)
    const second = createLegacyImportPlan(recordedDatabase)

    expect(first).toEqual(second)
    expect(first.pages.find((page) => page.slug === 'home')?.data.sections).toHaveLength(3)
    expect((first.pages.find((page) => page.slug === 'home')?.data.sections as any[])[1].items).toHaveLength(6)
    expect(first.pages.find((page) => page.slug === 'pilotes')?.data.sections).toEqual([expect.objectContaining({ items: [expect.objectContaining({ title: 'Alice Martin' })] })])
    expect(first.pages.map((page) => page.slug)).toContain('smh-cup-2026')
    expect(first.posts).toEqual([expect.objectContaining({ slug: 'bienvenue-team-smh', title: 'Bienvenue Team SMH' })])
    expect(statements.join('\n').toLowerCase()).not.toMatch(new RegExp(`\\b(${forbiddenTables.join('|')})\\b`))
    const settingsQuery = statements.find((statement) => /from settings/i.test(statement))
    expect(settingsQuery).toMatch(/^SELECT key, value FROM settings WHERE key IN \(/)
    expect(settingsQuery).toContain("'association_title'")
    expect(settingsQuery).not.toContain('maintenance_title')
  })

  test('dry-run performs no Payload writes', async () => {
    const writes: string[] = []
    const payload = {
      create: async () => { writes.push('create') },
      update: async () => { writes.push('update') },
      find: async ({ collection }: Record<string, unknown>) => {
        if (collection === 'users') return { docs: [{ id: 1, platformRoles: ['platform-admin'] }] }
        if (collection === 'organizations') return { docs: [{ id: 2, slug: 'team-smh', settings: { website: {} } }] }
        return { docs: [] }
      },
    }

    const result = await executeLegacyImport(payload, recordedDatabase)

    expect(writes).toEqual([])
    expect(result.pages).toEqual(expect.arrayContaining([['home', 'create'], ['smh-cup-2026', 'create']]))
    expect(result.posts).toEqual([['bienvenue-team-smh', 'create']])
  })

  test('apply creates or updates content and preserves organization settings when adding a tagline', async () => {
    const writes: Array<Record<string, unknown>> = []
    const existingSettings = {
      locale: 'fr-FR',
      timezone: 'Europe/Paris',
      publicContact: { email: 'contact@teamsmh.test', phone: '+33 4 00 00 00 00' },
      website: {
        enabled: true,
        primaryDomain: 'teamsmh.com',
        siteTitle: 'Team SMH',
        logo: 7,
        navigationMode: 'automatic',
        navigation: [],
        tagline: '',
        theme: { primaryColor: '#123456' },
      },
    }
    const payload = {
      create: async (args: Record<string, unknown>) => { writes.push({ operation: 'create', ...args }) },
      update: async (args: Record<string, unknown>) => { writes.push({ operation: 'update', ...args }) },
      find: async ({ collection, where }: Record<string, unknown>) => {
        if (collection === 'users') return { docs: [{ id: 1, platformRoles: ['platform-admin'] }] }
        if (collection === 'organizations') return { docs: [{ id: 2, slug: 'team-smh', settings: existingSettings }] }
        const slug = ((where as { and?: Array<{ slug?: { equals?: string } }> }).and?.[1]?.slug?.equals)
        return { docs: slug === 'home' ? [{ id: 3, slug: 'home' }] : [] }
      },
    }

    await executeLegacyImport(payload, recordedDatabase, true)

    expect(writes.filter((write) => write.operation === 'create')).not.toHaveLength(0)
    expect(writes).toContainEqual(expect.objectContaining({ operation: 'update', collection: 'pages', id: 3 }))
    expect(writes.filter((write) => write.collection === 'pages' || write.collection === 'posts')).toEqual(expect.arrayContaining([
      expect.objectContaining({ draft: false }),
    ]))
    expect(writes.every((write) => write.collection !== 'users')).toBe(true)
    expect(writes.every((write) => write.operation !== 'delete')).toBe(true)
    expect(writes).toContainEqual(expect.objectContaining({
      operation: 'update',
      collection: 'organizations',
      id: 2,
      data: { settings: { ...existingSettings, website: { ...existingSettings.website, tagline: 'Association Team SMH' } } },
    }))
    expect(writes).toContainEqual(expect.objectContaining({
      collection: 'organizations',
      data: expect.objectContaining({
        settings: expect.objectContaining({
          website: expect.objectContaining({ theme: { primaryColor: '#123456' } }),
        }),
      }),
    }))
  })
})