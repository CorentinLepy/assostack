import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

const relationshipID = (value: any) =>
  value && typeof value === 'object' && 'id' in value ? value.id : value

describe('CRM notes', () => {
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

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Notes Alpha', slug: 'notes-alpha', status: 'active' } as any,
    })
    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Notes Beta', slug: 'notes-beta', status: 'active' } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'notes-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Notes Admin A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }],
      } as any,
    })
    adminB = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'notes-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Notes Admin B',
        platformRoles: ['user'],
        organizations: [{ organization: organizationB.id, roles: ['organization-admin'] }],
      } as any,
    })
    editorA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'notes-editor-a@assostack.test',
        password: 'test-password-123',
        name: 'Notes Editor A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['editor'] }],
      } as any,
    })
    memberA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'notes-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Notes Member A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['member'] }],
      } as any,
    })

    contactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: { displayName: 'Notes Contact Alpha', organization: organizationA.id } as any,
    })
    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      data: { displayName: 'Notes Contact Beta', organization: organizationB.id } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('lets an editor create a pinned note with immutable creator attribution', async () => {
    const occurredAt = '2026-09-01T08:30:00.000Z'
    const note = await payload.create({
      collection: 'notes',
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        subject: 'Important context',
        body: 'Partner prefers email follow-up after meetings.',
        contact: contactA.id,
        pinned: true,
        occurredAt,
        organization: organizationA.id,
      } as any,
    })

    expect(note.subject).toBe('Important context')
    expect(note.body).toContain('email follow-up')
    expect(note.pinned).toBe(true)
    expect(note.occurredAt).toBe(occurredAt)
    expect(relationshipID(note.contact)).toBe(contactA.id)
    expect(relationshipID(note.createdBy)).toBe(editorA.id)

    const updated = await payload.update({
      collection: 'notes',
      id: note.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: { pinned: false, createdBy: adminA.id } as any,
    })

    expect(updated.pinned).toBe(false)
    expect(relationshipID(updated.createdBy)).toBe(editorA.id)
  })

  test('rejects a crafted cross-tenant Contact relationship', async () => {
    await expect(
      payload.create({
        collection: 'notes',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          subject: 'Forbidden note',
          body: 'This must not cross tenant boundaries.',
          contact: contactB.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('prevents moving an existing note to another tenant Contact', async () => {
    const note = await payload.create({
      collection: 'notes',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        body: 'Original tenant-safe note.',
        contact: contactA.id,
        organization: organizationA.id,
      } as any,
    })

    await expect(
      payload.update({
        collection: 'notes',
        id: note.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: { contact: contactB.id } as any,
      }),
    ).rejects.toThrow()
  })

  test('isolates note reads between organizations', async () => {
    const alphaNote = await payload.create({
      collection: 'notes',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        subject: 'Alpha-only context',
        body: 'Visible only inside organization Alpha.',
        contact: contactA.id,
        organization: organizationA.id,
      } as any,
    })

    const alphaView = await payload.find({
      collection: 'notes',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      limit: 50,
    })
    const betaView = await payload.find({
      collection: 'notes',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      limit: 50,
    })

    expect(alphaView.docs.map((doc) => doc.id)).toContain(alphaNote.id)
    expect(betaView.docs.map((doc) => doc.id)).not.toContain(alphaNote.id)
  })

  test('ordinary members cannot read or create staff notes', async () => {
    await expect(
      payload.find({
        collection: 'notes',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
        limit: 20,
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'notes',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
        data: {
          body: 'Member-created staff note should be rejected.',
          contact: contactA.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('editors cannot delete notes but organization admins can', async () => {
    const note = await payload.create({
      collection: 'notes',
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        body: 'Deletion policy test.',
        contact: contactA.id,
        organization: organizationA.id,
      } as any,
    })

    await expect(
      payload.delete({
        collection: 'notes',
        id: note.id,
        overrideAccess: false,
        user: asRequestUser(editorA) as any,
      }),
    ).rejects.toThrow()

    await expect(
      payload.delete({
        collection: 'notes',
        id: note.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
      }),
    ).resolves.toBeTruthy()
  })
})
