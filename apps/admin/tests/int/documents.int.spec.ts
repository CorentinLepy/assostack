import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload
const asRequestUser = <T extends object>(user: T) => ({ ...structuredClone(user), collection: 'users' as const })
const persistedRequestUser = async (user: { id: number | string }) =>
  asRequestUser(await payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true }))
const relationshipID = (value: any) => (value && typeof value === 'object' && 'id' in value ? value.id : value)
const pdfFixture = Buffer.from('%PDF-1.4\n% AssoStack private document fixture\n')

const documentFile = (name: string) => ({
  data: pdfFixture,
  mimetype: 'application/pdf',
  name,
  size: pdfFixture.length,
})

describe('Association documents', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let editorA: any
  let memberA: any
  let contactA: any
  let contactB: any

  beforeAll(async () => {
    payload = await getPayload({ config })
    organizationA = await payload.create({ collection: 'organizations', overrideAccess: true, data: { name: 'Documents Alpha', slug: 'documents-alpha', status: 'active' } as any })
    organizationB = await payload.create({ collection: 'organizations', overrideAccess: true, data: { name: 'Documents Beta', slug: 'documents-beta', status: 'active' } as any })
    adminA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'documents-admin-a@assostack.test', password: 'test-password-123', name: 'Documents Admin A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }] } as any })
    adminB = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'documents-admin-b@assostack.test', password: 'test-password-123', name: 'Documents Admin B', platformRoles: ['user'], organizations: [{ organization: organizationB.id, roles: ['organization-admin'] }] } as any })
    editorA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'documents-editor-a@assostack.test', password: 'test-password-123', name: 'Documents Editor A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['editor'] }] } as any })
    memberA = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'documents-member-a@assostack.test', password: 'test-password-123', name: 'Documents Member A', platformRoles: ['user'], organizations: [{ organization: organizationA.id, roles: ['member'] }] } as any })
    contactA = await payload.create({ collection: 'contacts', overrideAccess: false, user: (await persistedRequestUser(adminA)) as any, data: { displayName: 'Documents Contact Alpha', organization: organizationA.id } as any })
    contactB = await payload.create({ collection: 'contacts', overrideAccess: false, user: (await persistedRequestUser(adminB)) as any, data: { displayName: 'Documents Contact Beta', organization: organizationB.id } as any })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('allows editors to upload tenant-scoped private documents with immutable attribution', async () => {
    const document = await payload.create({
      collection: 'documents',
      overrideAccess: false,
      user: (await persistedRequestUser(editorA)) as any,
      data: {
        organization: organizationA.id,
        title: 'Volunteer agreement',
        category: 'agreement',
        contact: contactA.id,
      } as any,
      file: documentFile('volunteer-agreement.pdf'),
    })

    expect(document.status).toBe('active')
    expect(relationshipID(document.organization)).toBe(organizationA.id)
    expect(relationshipID(document.contact)).toBe(contactA.id)
    expect(relationshipID(document.createdBy)).toBe(editorA.id)
    expect(document.mimeType).toBe('application/pdf')

    const updated = await payload.update({
      collection: 'documents',
      id: document.id,
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { status: 'archived', createdBy: adminA.id } as any,
    })

    expect(updated.status).toBe('archived')
    expect(relationshipID(updated.createdBy)).toBe(editorA.id)
  })

  test('rejects cross-tenant Contact relationships', async () => {
    await expect(
      payload.create({
        collection: 'documents',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: { organization: organizationA.id, title: 'Invalid cross tenant', contact: contactB.id } as any,
        file: documentFile('invalid-cross-tenant.pdf'),
      }),
    ).rejects.toThrow()
  })

  test('denies ordinary members broad document access and isolates organizations', async () => {
    await expect(
      payload.find({ collection: 'documents', overrideAccess: false, user: (await persistedRequestUser(memberA)) as any, limit: 10 }),
    ).rejects.toThrow()

    await payload.create({
      collection: 'documents',
      overrideAccess: false,
      user: (await persistedRequestUser(adminB)) as any,
      data: { organization: organizationB.id, title: 'Beta private file' } as any,
      file: documentFile('beta-private.pdf'),
    })

    const alpha = await payload.find({
      collection: 'documents',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      limit: 50,
    })
    expect(alpha.docs.every((doc: any) => String(relationshipID(doc.organization)) === String(organizationA.id))).toBe(true)
  })

  test('restricts destructive deletion to organization admins', async () => {
    const document = await payload.create({
      collection: 'documents',
      overrideAccess: false,
      user: (await persistedRequestUser(editorA)) as any,
      data: { organization: organizationA.id, title: 'Deletion policy' } as any,
      file: documentFile('deletion-policy.pdf'),
    })

    await expect(
      payload.delete({ collection: 'documents', id: document.id, overrideAccess: false, user: (await persistedRequestUser(editorA)) as any }),
    ).rejects.toThrow()

    await expect(
      payload.delete({ collection: 'documents', id: document.id, overrideAccess: false, user: (await persistedRequestUser(adminA)) as any }),
    ).resolves.toBeTruthy()
  })
})
