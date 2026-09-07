import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload
const asRequestUser = <T extends object>(user: T) => ({ ...structuredClone(user), collection: 'users' as const })
const persistedRequestUser = async (user: { id: number | string }) => asRequestUser(await payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true }))
const relationshipID = (value: any) => (value && typeof value === 'object' && 'id' in value ? value.id : value)

describe('Association forms and submissions', () => {
  let organizationA: any, organizationB: any, adminA: any, adminB: any, editorA: any, memberA: any, contactA: any, contactB: any, formA: any, formB: any
  beforeAll(async () => {
    payload = await getPayload({ config })
    organizationA = await payload.create({ collection: 'organizations', overrideAccess: true, data: { name: 'Forms Alpha', slug: 'forms-alpha', status: 'active' } as any })
    organizationB = await payload.create({ collection: 'organizations', overrideAccess: true, data: { name: 'Forms Beta', slug: 'forms-beta', status: 'active' } as any })
    adminA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'forms-admin-a@assostack.test', password: 'test-password-123', name: 'Forms Admin A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }] } as any })
    adminB = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'forms-admin-b@assostack.test', password: 'test-password-123', name: 'Forms Admin B', platformRoles: ['user'], organizations: [{ organization: organizationB.id, roles: ['organization-admin'] }] } as any })
    editorA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'forms-editor-a@assostack.test', password: 'test-password-123', name: 'Forms Editor A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['editor'] }] } as any })
    memberA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'forms-member-a@assostack.test', password: 'test-password-123', name: 'Forms Member A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['member'] }] } as any })
    contactA = await payload.create({ collection: 'contacts', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { displayName: 'Forms Contact Alpha', organization: organizationA.id } as any })
    contactB = await payload.create({ collection: 'contacts', overrideAccess: false, user: (await persistedRequestUser(adminB)) as any, data: { displayName: 'Forms Contact Beta', organization: organizationB.id } as any })
    formA = await payload.create({ collection: 'forms', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, title: 'Volunteer application', status: 'active', fields: [{ label: 'Full name', key: 'Full Name', type: 'short-text', required: true }, { label: 'Email', key: 'email', type: 'email', required: true }, { label: 'Available', key: 'available', type: 'boolean', required: true }, { label: 'Role', key: 'role', type: 'single-select', options: [{ label: 'Marshal', value: 'marshal' }, { label: 'Logistics', value: 'logistics' }] }] } as any })
    formB = await payload.create({ collection: 'forms', overrideAccess: false, user: (await persistedRequestUser(adminB)) as any, data: { organization: organizationB.id, title: 'Volunteer application', status: 'active', fields: [] } as any })
  })
  afterAll(async () => { await payload.destroy() })

  test('normalizes form and field keys while allowing form-key reuse in another tenant', () => {
    expect(formA.key).toBe('volunteer-application'); expect(formB.key).toBe('volunteer-application'); expect(formA.fields[0].key).toBe('full-name')
  })
  test('rejects duplicate form keys and invalid field schemas inside one tenant', async () => {
    await expect(payload.create({ collection: 'forms', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, title: 'Duplicate', key: formA.key, fields: [] } as any })).rejects.toThrow()
    await expect(payload.create({ collection: 'forms', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, title: 'Bad fields', fields: [{ label: 'A', key: 'same', type: 'short-text' }, { label: 'B', key: 'same', type: 'short-text' }] } as any })).rejects.toThrow()
    await expect(payload.create({ collection: 'forms', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, title: 'Bad select', fields: [{ label: 'Choice', key: 'choice', type: 'single-select' }] } as any })).rejects.toThrow()
  })
  test('allows editors to create valid typed submissions and snapshots schema metadata', async () => {
    const submission = await payload.create({ collection: 'form-submissions', overrideAccess: false, user: (await persistedRequestUser(editorA)) as any, data: { organization: organizationA.id, form: formA.id, contact: contactA.id, source: 'manual', values: [{ fieldKey: 'full-name', fieldLabel: 'spoof', fieldType: 'short-text', textValue: 'Alice Example' }, { fieldKey: 'email', fieldLabel: 'spoof', fieldType: 'email', textValue: 'alice@example.test' }, { fieldKey: 'available', fieldLabel: 'spoof', fieldType: 'boolean', booleanValue: false }, { fieldKey: 'role', fieldLabel: 'spoof', fieldType: 'single-select', singleSelectValue: 'marshal' }] } as any })
    const values = submission.values ?? []
    expect(relationshipID(submission.form)).toBe(formA.id); expect(relationshipID(submission.contact)).toBe(contactA.id); expect(relationshipID(submission.createdBy)).toBe(editorA.id); expect(submission.submittedAt).toEqual(expect.any(String)); expect(values.find((v: any) => v.fieldKey === 'full-name')?.fieldLabel).toBe('Full name'); expect(values.find((v: any) => v.fieldKey === 'available')?.booleanValue).toBe(false)
  })
  test('rejects missing required fields, invalid select values and invalid emails', async () => {
    await expect(payload.create({ collection: 'form-submissions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, form: formA.id, values: [{ fieldKey: 'full-name', textValue: 'Alice' }] } as any })).rejects.toThrow()
    await expect(payload.create({ collection: 'form-submissions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, form: formA.id, values: [{ fieldKey: 'full-name', textValue: 'Alice' }, { fieldKey: 'email', textValue: 'not-an-email' }, { fieldKey: 'available', booleanValue: true }] } as any })).rejects.toThrow()
    await expect(payload.create({ collection: 'form-submissions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, form: formA.id, values: [{ fieldKey: 'full-name', textValue: 'Alice' }, { fieldKey: 'email', textValue: 'alice@example.test' }, { fieldKey: 'available', booleanValue: true }, { fieldKey: 'role', singleSelectValue: 'driver' }] } as any })).rejects.toThrow()
  })
  test('rejects cross-tenant Form and Contact relationships', async () => {
    await expect(payload.create({ collection: 'form-submissions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, form: formB.id, values: [] } as any })).rejects.toThrow()
    await expect(payload.create({ collection: 'form-submissions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, form: formA.id, contact: contactB.id, values: [] } as any })).rejects.toThrow()
  })
  test('keeps submission payload/source/relationships immutable while allowing review status changes', async () => {
    const submission = await payload.create({ collection: 'form-submissions', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { organization: organizationA.id, form: formA.id, contact: contactA.id, source: 'api', values: [{ fieldKey: 'full-name', textValue: 'Immutable User' }, { fieldKey: 'email', textValue: 'immutable@example.test' }, { fieldKey: 'available', booleanValue: true }] } as any })
    const updated = await payload.update({ collection: 'form-submissions', id: submission.id, overrideAccess: false, user: (await persistedRequestUser(editorA)) as any, data: { status: 'reviewing', form: formB.id, contact: contactB.id, source: 'integration', values: [{ fieldKey: 'full-name', textValue: 'Changed' }] } as any })
    const values = updated.values ?? []
    expect(updated.status).toBe('reviewing'); expect(relationshipID(updated.form)).toBe(formA.id); expect(relationshipID(updated.contact)).toBe(contactA.id); expect(updated.source).toBe('api'); expect(values.find((v: any) => v.fieldKey === 'full-name')?.textValue).toBe('Immutable User')
  })
  test('prevents schema changes and deletion once submission history exists', async () => {
    await expect(payload.update({ collection: 'forms', id: formA.id, overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { fields: [{ label: 'Changed', key: 'changed', type: 'short-text' }] } as any })).rejects.toThrow()
    await expect(payload.delete({ collection: 'forms', id: formA.id, overrideAccess: false, user: (await persistedRequestUser(adminA)) as any })).rejects.toThrow()
    const archived = await payload.update({ collection: 'forms', id: formA.id, overrideAccess: false, user: (await persistedRequestUser(editorA)) as any, data: { status: 'archived' } }); expect(archived.status).toBe('archived')
  })
  test('denies ordinary members broad access and isolates tenants', async () => {
    await expect(payload.find({ collection: 'forms', overrideAccess: false, user: (await persistedRequestUser(memberA)) as any, limit: 10 })).rejects.toThrow()
    await expect(payload.find({ collection: 'form-submissions', overrideAccess: false, user: (await persistedRequestUser(memberA)) as any, limit: 10 })).rejects.toThrow()
    const beta = await payload.find({ collection: 'form-submissions', overrideAccess: false, user: (await persistedRequestUser(adminB)) as any, limit: 50 }); expect(beta.docs.every((doc: any) => String(relationshipID(doc.organization)) === String(organizationB.id))).toBe(true)
  })
})
