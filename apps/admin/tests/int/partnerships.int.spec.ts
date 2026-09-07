import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends object>(user: T) => ({
  ...structuredClone(user),
  collection: 'users' as const,
})

const persistedRequestUser = async (user: { id: number | string }) =>
  asRequestUser(
    await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 0,
      overrideAccess: true,
    }),
  )

const relationshipID = (value: any) =>
  value && typeof value === 'object' && 'id' in value ? value.id : value

describe('Partnerships', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let editorA: any
  let memberA: any
  let companyA: any
  let personA: any
  let personB: any
  let levelA: any
  let levelB: any
  let partnershipA: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Partner Alpha', slug: 'partner-alpha', status: 'active' } as any,
    })
    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Partner Beta', slug: 'partner-beta', status: 'active' } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'partnership-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Partnership Admin A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }],
      } as any,
    })
    adminB = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'partnership-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Partnership Admin B',
        platformRoles: ['user'],
        organizations: [{ organization: organizationB.id, roles: ['organization-admin'] }],
      } as any,
    })
    editorA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'partnership-editor-a@assostack.test',
        password: 'test-password-123',
        name: 'Partnership Editor A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['editor'] }],
      } as any,
    })
    memberA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'partnership-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Partnership Member A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['member'] }],
      } as any,
    })

    companyA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: {
        kind: 'organization',
        displayName: 'Acme Alpha',
        organizationDetails: { name: 'Acme Alpha' },
        organization: organizationA.id,
      } as any,
    })
    personA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { kind: 'person', displayName: 'Alice Alpha', organization: organizationA.id } as any,
    })
    personB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(adminB)) as any,
      data: { kind: 'person', displayName: 'Bob Beta', organization: organizationB.id } as any,
    })

    levelA = await payload.create({
      collection: 'partnership-levels',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { name: 'Gold', sortOrder: 10, organization: organizationA.id } as any,
    })
    levelB = await payload.create({
      collection: 'partnership-levels',
      overrideAccess: false,
      user: (await persistedRequestUser(adminB)) as any,
      data: { name: 'Gold', sortOrder: 10, organization: organizationB.id } as any,
    })

    partnershipA = await payload.create({
      collection: 'partnerships',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: {
        name: 'Acme Alpha - 2027',
        partner: companyA.id,
        primaryContact: personA.id,
        level: levelA.id,
        kind: 'sponsor',
        status: 'active',
        startsAt: '2027-01-01T00:00:00.000Z',
        endsAt: '2027-12-31T00:00:00.000Z',
        agreementReference: 'AGR-2027-001',
        externalReference: 'partner-import-1',
        organization: organizationA.id,
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('normalizes reusable level keys and allows the same level key in another tenant', () => {
    expect(levelA.key).toBe('gold')
    expect(levelB.key).toBe('gold')
    expect(levelA.sortOrder).toBe(10)
  })

  test('rejects duplicate level keys in one organization', async () => {
    await expect(
      payload.create({
        collection: 'partnership-levels',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: { name: 'GOLD', organization: organizationA.id } as any,
      }),
    ).rejects.toThrow(/key/i)
  })

  test('validates level ordering metadata', async () => {
    await expect(
      payload.create({
        collection: 'partnership-levels',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: { name: 'Invalid order', sortOrder: 1.5, organization: organizationA.id } as any,
      }),
    ).rejects.toThrow(/sortOrder/i)
  })

  test('archives and restores levels and prevents deleting referenced history', async () => {
    const archived = await payload.update({
      collection: 'partnership-levels',
      id: levelA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(editorA)) as any,
      data: { status: 'archived' },
    })
    expect(archived.archivedAt).toEqual(expect.any(String))

    const restored = await payload.update({
      collection: 'partnership-levels',
      id: levelA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { status: 'active' },
    })
    expect(restored.archivedAt).toBeNull()

    await expect(
      payload.delete({
        collection: 'partnership-levels',
        id: levelA.id,
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
      }),
    ).rejects.toThrow(/id/i)
  })

  test('creates an organization partnership without duplicating CRM identity', () => {
    expect(partnershipA.key).toBe('acme-alpha-2027')
    expect(relationshipID(partnershipA.partner)).toBe(companyA.id)
    expect(relationshipID(partnershipA.primaryContact)).toBe(personA.id)
    expect(relationshipID(partnershipA.level)).toBe(levelA.id)
    expect(relationshipID(partnershipA.createdBy)).toBe(adminA.id)
  })

  test('also supports an individual Contact as the canonical partner', async () => {
    const individual = await payload.create({
      collection: 'partnerships',
      overrideAccess: false,
      user: (await persistedRequestUser(editorA)) as any,
      data: {
        name: 'Alice patronage 2027',
        partner: personA.id,
        kind: 'partner',
        status: 'prospect',
        organization: organizationA.id,
      } as any,
    })

    expect(relationshipID(individual.partner)).toBe(personA.id)
    expect(relationshipID(individual.createdBy)).toBe(editorA.id)
  })

  test('keeps createdBy immutable', async () => {
    const updated = await payload.update({
      collection: 'partnerships',
      id: partnershipA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(editorA)) as any,
      data: { status: 'paused', createdBy: editorA.id } as any,
    })
    expect(updated.status).toBe('paused')
    expect(relationshipID(updated.createdBy)).toBe(adminA.id)
  })

  test('rejects duplicate partnership keys within a tenant and allows reuse across tenants', async () => {
    await expect(
      payload.create({
        collection: 'partnerships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: {
          name: 'Acme Alpha 2027',
          key: 'acme-alpha-2027',
          partner: companyA.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/key/i)

    await expect(
      payload.create({
        collection: 'partnerships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminB)) as any,
        data: {
          name: 'Acme Alpha 2027',
          key: 'acme-alpha-2027',
          partner: personB.id,
          organization: organizationB.id,
        } as any,
      }),
    ).resolves.toBeTruthy()
  })

  test('rejects cross-tenant partner, primary contact and level relationships', async () => {
    await expect(
      payload.create({
        collection: 'partnerships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: { name: 'Bad partner', partner: personB.id, organization: organizationA.id } as any,
      }),
    ).rejects.toThrow(/partner/i)

    await expect(
      payload.create({
        collection: 'partnerships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: {
          name: 'Bad primary',
          partner: companyA.id,
          primaryContact: personB.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/primaryContact/i)

    await expect(
      payload.create({
        collection: 'partnerships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: {
          name: 'Bad level',
          partner: companyA.id,
          level: levelB.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/level/i)
  })

  test('rejects an end date before the start date', async () => {
    await expect(
      payload.create({
        collection: 'partnerships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: {
          name: 'Invalid dates',
          partner: companyA.id,
          startsAt: '2027-06-02T00:00:00.000Z',
          endsAt: '2027-06-01T00:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/endsAt/i)
  })

  test('isolates reads between organizations and denies ordinary members', async () => {
    const betaView = await payload.find({
      collection: 'partnerships',
      overrideAccess: false,
      user: (await persistedRequestUser(adminB)) as any,
      limit: 50,
    })
    expect(betaView.docs.map((doc) => doc.id)).not.toContain(partnershipA.id)

    await expect(
      payload.find({
        collection: 'partnerships',
        overrideAccess: false,
        user: (await persistedRequestUser(memberA)) as any,
        limit: 20,
      }),
    ).rejects.toThrow()

    await expect(
      payload.find({
        collection: 'partnership-levels',
        overrideAccess: false,
        user: (await persistedRequestUser(memberA)) as any,
        limit: 20,
      }),
    ).rejects.toThrow()
  })
})
