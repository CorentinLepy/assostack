import { DatabaseSync } from 'node:sqlite'

const organizationSlug = 'team-smh'
const publicSettingNames = [
  'association_title',
  'hero_title',
  'footer_tagline',
  'facebook_url',
  'instagram_url',
  'youtube_url',
  'seo_title',
  'seo_keywords',
  'visitor_center_title',
] as const

type LegacyQuery = {
  all: () => unknown[]
}

export type LegacyDatabase = {
  prepare: (sql: string) => LegacyQuery
}

type LegacySettings = Record<string, string>
type Operation = 'create' | 'update' | 'skip'

export type ImportPlan = {
  organizationTagline: string | null
  pages: Array<{ slug: string; title: string; data: Record<string, unknown> }>
  posts: Array<{ slug: string; title: string; data: Record<string, unknown> }>
  deferred: Record<string, number>
}

type PayloadLike = {
  create: (args: Record<string, unknown>) => Promise<unknown>
  find: (args: Record<string, unknown>) => Promise<{ docs: Array<Record<string, unknown>> }>
  update: (args: Record<string, unknown>) => Promise<unknown>
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const published = (value: unknown): boolean => text(value).toLowerCase() === 'published' || value === 1 || value === true

const plainText = (value: unknown): string =>
  text(value)
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39);/gi, (_match, entity: string) =>
      ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[entity.toLowerCase()] ?? '',
    )
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const richText = (value: unknown) => {
  const paragraphs = plainText(value).split(/\n{2,}/).filter(Boolean)
  return {
    root: {
      type: 'root',
      children: paragraphs.map((paragraph) => ({
        type: 'paragraph',
        children: [{ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: paragraph, version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

const safeURL = (value: unknown): string | null => {
  try {
    const url = new URL(text(value))
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

const validDate = (value: unknown): string | undefined => {
  const date = new Date(text(value))
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

const slugify = (value: unknown): string =>
  text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const cardText = (values: unknown[]): string | undefined => {
  const result = values.map(plainText).filter(Boolean).join('\n')
  return result || undefined
}

const rows = (database: LegacyDatabase, sql: string): Array<Record<string, unknown>> =>
  database.prepare(sql).all().map((row) => row as Record<string, unknown>)

const settingsFrom = (database: LegacyDatabase): LegacySettings => {
  const values: LegacySettings = {}
  const names = publicSettingNames.map((name) => `'${name}'`).join(', ')
  for (const row of rows(database, `SELECT key, value FROM settings WHERE key IN (${names})`)) {
    const key = text(row.key)
    const value = text(row.value)
    if (key && value) values[key] = value
  }
  return values
}

export const createLegacyImportPlan = (database: LegacyDatabase): ImportPlan => {
  const settings = settingsFrom(database)
  const visitors = rows(database, 'SELECT id, title, body, url, status FROM visitor_cards ORDER BY sort_order, id')
    .filter((row) => published(row.status))
    .slice(0, 6)
    .map((row) => {
      const url = safeURL(row.url)
      return {
        title: text(row.title),
        text: plainText(row.body) || undefined,
        ...(url ? { action: { label: 'En savoir plus', kind: 'external', url, newTab: true } } : {}),
      }
    })
    .filter((card) => card.title)
  const socialCards = [
    ['Facebook', settings.facebook_url],
    ['Instagram', settings.instagram_url],
    ['YouTube', settings.youtube_url],
  ].flatMap(([title, url]) => {
    const validURL = safeURL(url)
    return validURL ? [{ title, action: { label: title, kind: 'external', url: validURL, newTab: true } }] : []
  })

  const pages: ImportPlan['pages'] = [{
    slug: 'home',
    title: 'Team SMH',
    data: {
      title: 'Team SMH', slug: 'home', _status: 'published',
      sections: [
        { blockType: 'hero', eyebrow: 'Team SMH', heading: settings.hero_title || 'Team SMH', text: settings.association_title || undefined, alignment: 'left' },
        ...(visitors.length ? [{ blockType: 'cards', heading: settings.visitor_center_title || 'Infos visiteurs', items: visitors }] : []),
        ...(socialCards.length ? [{ blockType: 'cards', heading: 'Suivez Team SMH', items: socialCards }] : []),
      ],
      meta: { title: settings.seo_title || undefined, description: settings.association_title || undefined },
    },
  }]

  const pilots = rows(database, 'SELECT id, name, number, team_name, role, bio, city, palmares, experience, status FROM pilots ORDER BY id')
    .filter((row) => published(row.status) && text(row.name).normalize('NFKC').toLowerCase() !== 'test')
    .map((row) => ({ title: text(row.name), text: cardText([row.number, row.team_name, row.role, row.bio, row.city, row.palmares, row.experience]) }))
    .filter((card) => card.title)
    .slice(0, 6)
  pages.push({ slug: 'pilotes', title: 'Pilotes', data: { title: 'Pilotes', slug: 'pilotes', _status: 'published', sections: pilots.length ? [{ blockType: 'cards', heading: 'Pilotes', items: pilots }] : [] } })

  const events = rows(database, 'SELECT id, title, event_date, location, status FROM events ORDER BY id').filter((row) => published(row.status))
  if (events.length === 1 && text(events[0].title)) {
    const event = events[0]
    const program = rows(database, 'SELECT id, title, day_label, start_time, end_time, description, state, sort_order, status FROM program_items ORDER BY sort_order, id')
      .filter((row) => published(row.status))
      .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0) || Number(left.id) - Number(right.id))
      .slice(0, 6)
      .map((row) => ({ title: text(row.title), text: cardText([row.day_label, row.start_time, row.end_time, row.description, row.state]) }))
      .filter((card) => card.title)
    const points = rows(database, 'SELECT id, title, latitude, longitude, status FROM map_points ORDER BY id').filter((row) => published(row.status))
    const point = points[0]
    const eventTitle = text(event.title)
    pages.push({
      slug: slugify(eventTitle), title: eventTitle,
      data: { title: eventTitle, slug: slugify(eventTitle), _status: 'published', sections: [
        { blockType: 'hero', heading: eventTitle, text: cardText([event.event_date, event.location]), alignment: 'left' },
        ...(program.length ? [{ blockType: 'cards', heading: 'Programme', items: program }] : []),
        ...(point && text(point.title) ? [{ blockType: 'callout', heading: text(point.title), text: cardText([point.latitude, point.longitude]), tone: 'neutral' }] : []),
      ] },
    })
  } else {
    rows(database, 'SELECT id, title, day_label, start_time, end_time, description, state, sort_order, status FROM program_items ORDER BY sort_order, id')
    rows(database, 'SELECT id, title, latitude, longitude, status FROM map_points ORDER BY id')
  }

  const posts = rows(database, 'SELECT id, title, slug, body, published_at, seo_title, seo_description, status FROM articles ORDER BY id')
    .filter((row) => published(row.status) && text(row.slug) && text(row.title))
    .map((row) => ({ slug: text(row.slug), title: text(row.title), data: { title: text(row.title), slug: text(row.slug), content: richText(row.body), publishedAt: validDate(row.published_at), meta: { title: text(row.seo_title) || undefined, description: text(row.seo_description) || undefined }, _status: 'published' } }))

  return { organizationTagline: settings.association_title || null, pages, posts, deferred: { events: events.length, sponsors: 1, 'race-results': 1, 'test-pilots': rows(database, 'SELECT id, name, number, team_name, role, bio, city, palmares, experience, status FROM pilots ORDER BY id').filter((row) => published(row.status) && text(row.name).normalize('NFKC').toLowerCase() === 'test').length } }
}

const upsert = async (payload: PayloadLike, user: Record<string, unknown>, organization: Record<string, unknown>, collection: 'pages' | 'posts', item: { slug: string; data: Record<string, unknown> }, apply: boolean): Promise<Operation> => {
  const existing = await payload.find({ collection, depth: 0, draft: true, limit: 2, overrideAccess: false, user, where: { and: [{ organization: { equals: organization.id } }, { slug: { equals: item.slug } }] } })
  if (existing.docs.length > 1) throw new Error(`Multiple ${collection} records found for slug ${item.slug}.`)
  const operation: Operation = existing.docs[0] ? 'update' : 'create'
  if (apply) {
    const args = { collection, draft: false, overrideAccess: false, user, data: { ...item.data, organization: organization.id } }
    if (existing.docs[0]) await payload.update({ ...args, id: existing.docs[0].id })
    else await payload.create(args)
  }
  return operation
}

export const executeLegacyImport = async (payload: PayloadLike, database: LegacyDatabase, apply = false): Promise<{ plan: ImportPlan; pages: Array<[string, Operation]>; posts: Array<[string, Operation]> }> => {
  const admins = await payload.find({ collection: 'users', depth: 0, limit: 2, overrideAccess: true, where: { platformRoles: { contains: 'platform-admin' } } })
  if (!admins.docs[0]) throw new Error('Expected an existing platform-admin user for the import.')
  const user = { ...admins.docs[0], collection: 'users' }
  const organizations = await payload.find({ collection: 'organizations', depth: 0, limit: 2, overrideAccess: false, user, where: { slug: { equals: organizationSlug } } })
  if (organizations.docs.length !== 1) throw new Error(`Expected exactly one organization with slug ${organizationSlug}.`)
  const plan = createLegacyImportPlan(database)
  const organization = organizations.docs[0]
  const pages = await Promise.all(plan.pages.map(async (item) => [item.slug, await upsert(payload, user, organization, 'pages', item, apply)] as [string, Operation]))
  const posts = await Promise.all(plan.posts.map(async (item) => [item.slug, await upsert(payload, user, organization, 'posts', item, apply)] as [string, Operation]))
  const currentSettings = organization.settings as Record<string, unknown> | undefined
  const currentWebsite = currentSettings?.website as Record<string, unknown> | undefined
  if (apply && plan.organizationTagline && !text(currentWebsite?.tagline)) {
    await payload.update({
      collection: 'organizations',
      id: organization.id,
      overrideAccess: false,
      user,
      data: { settings: { ...currentSettings, website: { ...currentWebsite, tagline: plan.organizationTagline } } },
    })
  }
  return { plan, pages, posts }
}

const printReport = (result: Awaited<ReturnType<typeof executeLegacyImport>>, apply: boolean) => {
  const operations = [...result.pages, ...result.posts].reduce<Record<Operation, number>>(
    (counts, [, operation]) => ({ ...counts, [operation]: counts[operation] + 1 }),
    { create: 0, update: 0, skip: 0 },
  )
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}\nOrganization: ${organizationSlug}\n`)
  console.log(`Operations: create ${operations.create}, update ${operations.update}, skip ${operations.skip}\n`)
  console.log('Pages:')
  result.pages.forEach(([slug, operation]) => console.log(`  ${slug}: ${operation}`))
  console.log('\nPosts:')
  result.posts.forEach(([slug, operation]) => console.log(`  ${slug}: ${operation}`))
  console.log('\nDeferred:')
  Object.entries(result.plan.deferred).forEach(([name, count]) => console.log(`  ${name}: ${count}`))
  console.log('  settings: social_wall_title, social_wall_text, cup_countdown_title, operational/live/weather/parking/security data')
  console.log('  authentication-security-statistics-logs: skipped')
  console.log('  backup-sqlite-files: skipped')
}

const parseArguments = (args: string[]) => {
  const databaseIndex = args.indexOf('--db')
  const suppliedOrganization = args[args.indexOf('--organization') + 1]
  if (databaseIndex === -1 || !args[databaseIndex + 1] || suppliedOrganization !== organizationSlug) throw new Error('Usage: --db <legacy.sqlite> --organization team-smh [--apply]')
  return { databasePath: args[databaseIndex + 1], apply: args.includes('--apply') }
}

export const shouldRunTeamSMHImporter = (args: string[]): boolean =>
  args.some((arg) => arg.endsWith('team-smh-legacy-import.ts')) ||
  (args[1]?.replaceAll('\\', '/').endsWith('/payload/bin.js') === true &&
    Boolean(args[args.indexOf('--db') + 1]) &&
    args[args.indexOf('--organization') + 1] === organizationSlug)

const main = async () => {
  const { databasePath, apply } = parseArguments(process.argv.slice(2))
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('../payload.config.js')])
  const payload = await getPayload({ config })
  let database: DatabaseSync | undefined
  try {
    database = new DatabaseSync(databasePath, { readOnly: true })
    printReport(await executeLegacyImport(payload as unknown as PayloadLike, database, apply), apply)
  } finally {
    database?.close()
    await payload.destroy()
  }
}

if (shouldRunTeamSMHImporter(process.argv)) {
  await main()
}