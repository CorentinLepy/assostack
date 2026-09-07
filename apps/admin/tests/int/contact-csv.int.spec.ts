import config from '@/payload.config'
import { ContactCsvAccessError, exportContactsCsv, importContactsCsv } from '@/crm/contact-csv'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends object>(user: T) => ({ ...structuredClone(user), collection: 'users' as const })
const persistedRequestUser = async (user: { id: number | string }) =>
  asRequestUser(await payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true }))
const relationshipID = (value: any) => (value && typeof value === 'object' && 'id' in value ? value.id : value)

describe('CRM Contact CSV import/export', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let editorA: any
  let memberA: any
  let textFieldA: any
  let selectFieldA: any
  let multiFieldA: any

  beforeAll(async () => {
    payload = await getPayload({ config })
    organizationA = await payload.create({ collection: 'organizations', overrideAccess: true, data: { name: 'CSV Alpha', slug: 'csv-alpha', status: 'active' } as any })
    organizationB = await payload.create({ collection: 'organizations', overrideAccess: true, data: { name: 'CSV Beta', slug: 'csv-beta', status: 'active' } as any })

    adminA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'csv-admin-a@assostack.test', password: 'test-password-123', name: 'CSV Admin A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }] } as any })
    adminB = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'csv-admin-b@assostack.test', password: 'test-password-123', name: 'CSV Admin B', platformRoles: ['user'], organizations: [{ organization: organizationB.id, roles: ['organization-admin'] }] } as any })
    editorA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'csv-editor-a@assostack.test', password: 'test-password-123', name: 'CSV Editor A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['editor'] }] } as any })
    memberA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'csv-member-a@assostack.test', password: 'test-password-123', name: 'CSV Member A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['member'] }] } as any })

    textFieldA = await payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { label: 'Shirt note', type: 'short-text', sortOrder: 10, organization: organizationA.id } as any })
    selectFieldA = await payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { label: 'Preferred channel', type: 'single-select', sortOrder: 20, options: [{ label: 'Email', value: 'email' }, { label: 'Phone', value: 'phone' }], organization: organizationA.id } as any })
    multiFieldA = await payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { label: 'Interests', type: 'multi-select', sortOrder: 30, options: [{ label: 'Events', value: 'events' }, { label: 'News', value: 'news' }], organization: organizationA.id } as any })

    await payload.create({ collection: 'contacts', overrideAccess: false, user: (await persistedRequestUser(adminB)) as any, data: { displayName: 'Beta Secret Contact', organization: organizationB.id } as any })
  })

  afterAll(async () => { await payload.destroy() })

  test('dry-run validates valid rows without writing anything', async () => {
    const before = await payload.count({ collection: 'contacts', overrideAccess: true, where: { organization: { equals: organizationA.id } } })
    const result = await importContactsCsv({
      payload,
      user: await persistedRequestUser(editorA),
      organizationID: organizationA.id,
      dryRun: true,
      csv: `kind,firstName,lastName,email,custom:${textFieldA.key}\nperson,Jane,Doe,jane@example.test,XL`,
    })
    const after = await payload.count({ collection: 'contacts', overrideAccess: true, where: { organization: { equals: organizationA.id } } })

    expect(result.errors).toEqual([])
    expect(result.validRows).toBe(1)
    expect(result.importedRows).toBe(0)
    expect(after.totalDocs).toBe(before.totalDocs)
  })

  test('imports core fields and typed custom values for an editor', async () => {
    const result = await importContactsCsv({
      payload,
      user: await persistedRequestUser(editorA),
      organizationID: organizationA.id,
      dryRun: false,
      csv: `kind,displayName,email,countryCode,custom:${textFieldA.key},custom:${selectFieldA.key},custom:${multiFieldA.key}\nperson,"Doe, Jane",jane.csv@example.test,fr,XL,email,"[""events"",""news""]"`,
    })

    expect(result.errors).toEqual([])
    expect(result.importedRows).toBe(1)
    const contact = await payload.findByID({ collection: 'contacts', id: result.contactIDs[0], depth: 0, overrideAccess: true })
    expect(contact.displayName).toBe('Doe, Jane')
    expect(contact.address?.countryCode).toBe('FR')
    expect(relationshipID(contact.organization)).toBe(organizationA.id)

    const values = await payload.find({ collection: 'contact-custom-field-values', overrideAccess: true, limit: 20, where: { contact: { equals: contact.id } } })
    expect(values.docs).toHaveLength(3)
    expect(values.docs.some((value: any) => value.textValue === 'XL')).toBe(true)
    expect(values.docs.some((value: any) => value.singleSelectValue === 'email')).toBe(true)
    expect(values.docs.some((value: any) => Array.isArray(value.multiSelectValue) && value.multiSelectValue.join(',') === 'events,news')).toBe(true)
  })

  test('returns row-level errors and writes no rows when any row is invalid', async () => {
    const before = await payload.count({ collection: 'contacts', overrideAccess: true, where: { organization: { equals: organizationA.id } } })
    const result = await importContactsCsv({
      payload,
      user: await persistedRequestUser(adminA),
      organizationID: organizationA.id,
      dryRun: false,
      csv: `displayName,email,custom:${selectFieldA.key}\nValid Person,valid@example.test,email\nBroken Person,not-an-email,sms`,
    })
    const after = await payload.count({ collection: 'contacts', overrideAccess: true, where: { organization: { equals: organizationA.id } } })

    expect(result.importedRows).toBe(0)
    expect(result.errors.some((error) => error.row === 3 && error.column === 'email')).toBe(true)
    expect(result.errors.some((error) => error.row === 3 && error.column === `custom:${selectFieldA.key}`)).toBe(true)
    expect(after.totalDocs).toBe(before.totalDocs)
  })

  test('rejects unknown custom-field headers before processing rows', async () => {
    const result = await importContactsCsv({
      payload,
      user: await persistedRequestUser(adminA),
      organizationID: organizationA.id,
      csv: 'displayName,custom:does-not-exist\nSomeone,value',
    })
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ row: 1, column: 'custom:does-not-exist' })]))
  })

  test('validates custom select and multi-select values deterministically', async () => {
    const result = await importContactsCsv({
      payload,
      user: await persistedRequestUser(adminA),
      organizationID: organizationA.id,
      csv: `displayName,custom:${selectFieldA.key},custom:${multiFieldA.key}\nSomeone,sms,"[""events"",""other""]"`,
    })
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 2, column: `custom:${selectFieldA.key}` }),
      expect.objectContaining({ row: 2, column: `custom:${multiFieldA.key}` }),
    ]))
  })

  test('exports deterministic headers, quoted CSV values and custom fields', async () => {
    const csv = await exportContactsCsv({ payload, user: await persistedRequestUser(editorA), organizationID: organizationA.id })
    const firstLine = csv.split('\r\n')[0]

    expect(firstLine.startsWith('kind,status,displayName,firstName,lastName')).toBe(true)
    expect(firstLine.indexOf(`custom:${textFieldA.key}`)).toBeLessThan(firstLine.indexOf(`custom:${selectFieldA.key}`))
    expect(firstLine.indexOf(`custom:${selectFieldA.key}`)).toBeLessThan(firstLine.indexOf(`custom:${multiFieldA.key}`))
    expect(csv).toContain('"Doe, Jane"')
    expect(csv).toContain('XL')
  })

  test('never exports another tenant contacts', async () => {
    const csv = await exportContactsCsv({ payload, user: await persistedRequestUser(adminA), organizationID: organizationA.id })
    expect(csv).not.toContain('Beta Secret Contact')
  })

  test('denies ordinary members and cross-tenant staff', async () => {
    await expect(exportContactsCsv({ payload, user: await persistedRequestUser(memberA), organizationID: organizationA.id })).rejects.toBeInstanceOf(ContactCsvAccessError)
    await expect(importContactsCsv({ payload, user: await persistedRequestUser(adminB), organizationID: organizationA.id, csv: 'displayName\nNope' })).rejects.toBeInstanceOf(ContactCsvAccessError)
  })
})
