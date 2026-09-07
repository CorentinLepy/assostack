import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends object>(user: T) => ({ ...structuredClone(user), collection: 'users' as const })
const persistedRequestUser = async (user: { id: number | string }) =>
  asRequestUser(await payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true }))
const relationshipID = (value: any) => (value && typeof value === 'object' && 'id' in value ? value.id : value)

describe('CRM custom fields', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let editorA: any
  let memberA: any
  let contactA: any
  let contactB: any
  let textFieldA: any
  let selectFieldA: any

  beforeAll(async () => {
    payload = await getPayload({ config })
    organizationA = await payload.create({ collection: 'organizations', overrideAccess: true, data: { name: 'Fields Alpha', slug: 'fields-alpha', status: 'active' } as any })
    organizationB = await payload.create({ collection: 'organizations', overrideAccess: true, data: { name: 'Fields Beta', slug: 'fields-beta', status: 'active' } as any })

    adminA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'fields-admin-a@assostack.test', password: 'test-password-123', name: 'Fields Admin A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }] } as any })
    adminB = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'fields-admin-b@assostack.test', password: 'test-password-123', name: 'Fields Admin B', platformRoles: ['user'], organizations: [{ organization: organizationB.id, roles: ['organization-admin'] }] } as any })
    editorA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'fields-editor-a@assostack.test', password: 'test-password-123', name: 'Fields Editor A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['editor'] }] } as any })
    memberA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'fields-member-a@assostack.test', password: 'test-password-123', name: 'Fields Member A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['member'] }] } as any })

    contactA = await payload.create({ collection: 'contacts', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { displayName: 'Custom Alpha', organization: organizationA.id } as any })
    contactB = await payload.create({ collection: 'contacts', overrideAccess: false, user: (await persistedRequestUser(adminB)) as any, data: { displayName: 'Custom Beta', organization: organizationB.id } as any })

    textFieldA = await payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { label: 'T-shirt size note', type: 'short-text', organization: organizationA.id } as any })
    selectFieldA = await payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { label: 'Preferred channel', type: 'single-select', options: [{ label: 'Email', value: 'email' }, { label: 'Phone', value: 'phone' }], organization: organizationA.id } as any })
  })

  afterAll(async () => { await payload.destroy() })

  test('normalizes tenant-local keys and permits reuse in another tenant', async () => {
    expect(textFieldA.key).toBe('t-shirt-size-note')
    const other = await payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminB)) as any, data: { label: 'T-shirt size note', type: 'short-text', organization: organizationB.id } as any })
    expect(other.key).toBe(textFieldA.key)
  })

  test('rejects duplicate definition keys in one tenant', async () => {
    await expect(payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { label: 'T shirt size note', key: textFieldA.key, type: 'short-text', organization: organizationA.id } as any })).rejects.toThrow(/key/i)
  })

  test('requires valid unique select options', async () => {
    await expect(payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { label: 'Broken select', type: 'single-select', organization: organizationA.id } as any })).rejects.toThrow(/options/i)
    await expect(payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { label: 'Duplicate options', type: 'multi-select', options: [{ label: 'A', value: 'x' }, { label: 'B', value: 'x' }], organization: organizationA.id } as any })).rejects.toThrow(/options/i)
  })

  test('allows editors to manage typed Contact values but not definitions', async () => {
    await expect(payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(editorA)) as any, data: { label: 'Editor field', type: 'short-text', organization: organizationA.id } as any })).rejects.toThrow()

    const value = await payload.create({ collection: 'contact-custom-field-values', overrideAccess: false, user: (await persistedRequestUser(editorA)) as any, data: { contact: contactA.id, field: textFieldA.id, textValue: 'XL', organization: organizationA.id } as any })
    expect(relationshipID(value.contact)).toBe(contactA.id)
    expect(value.textValue).toBe('XL')
  })

  test('rejects wrong storage type and invalid select choices', async () => {
    await expect(payload.create({ collection: 'contact-custom-field-values', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { contact: contactA.id, field: textFieldA.id, numberValue: 42, organization: organizationA.id } as any })).rejects.toThrow(/field|type/i)
    await expect(payload.create({ collection: 'contact-custom-field-values', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { contact: contactA.id, field: selectFieldA.id, singleSelectValue: 'sms', organization: organizationA.id } as any })).rejects.toThrow(/selected/i)
  })

  test('rejects duplicate Contact/field pairs', async () => {
    await expect(payload.create({ collection: 'contact-custom-field-values', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { contact: contactA.id, field: textFieldA.id, textValue: 'L', organization: organizationA.id } as any })).rejects.toThrow(/one value|field/i)
  })

  test('rejects cross-tenant Contacts and definitions', async () => {
    await expect(payload.create({ collection: 'contact-custom-field-values', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { contact: contactB.id, field: selectFieldA.id, singleSelectValue: 'email', organization: organizationA.id } as any })).rejects.toThrow(/Contact/i)

    const fieldB = await payload.create({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(adminB)) as any, data: { label: 'Beta text', type: 'short-text', organization: organizationB.id } as any })
    await expect(payload.create({ collection: 'contact-custom-field-values', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { contact: contactA.id, field: fieldB.id, textValue: 'x', organization: organizationA.id } as any })).rejects.toThrow(/field/i)
  })

  test('archives definitions and keeps historical values readable', async () => {
    const archived = await payload.update({ collection: 'custom-field-definitions', id: textFieldA.id, overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { status: 'archived' } })
    expect(archived.archivedAt).toEqual(expect.any(String))
    const values = await payload.find({ collection: 'contact-custom-field-values', overrideAccess: false, user: (await persistedRequestUser(editorA)) as any, limit: 20 })
    expect(values.docs.some((doc) => relationshipID(doc.field) === textFieldA.id)).toBe(true)
  })

  test('prevents changing a definition type after values exist', async () => {
    await expect(payload.update({ collection: 'custom-field-definitions', id: textFieldA.id, overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { type: 'number' } })).rejects.toThrow(/type/i)
  })

  test('denies ordinary members broad access', async () => {
    await expect(payload.find({ collection: 'custom-field-definitions', overrideAccess: false, user: (await persistedRequestUser(memberA)) as any, limit: 10 })).rejects.toThrow()
    await expect(payload.find({ collection: 'contact-custom-field-values', overrideAccess: false, user: (await persistedRequestUser(memberA)) as any, limit: 10 })).rejects.toThrow()
  })
})
