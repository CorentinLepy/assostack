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

describe('Association memberships', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let memberA: any
  let contactA: any
  let contactB: any
  let typeA: any
  let typeB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Membership Alpha', slug: 'membership-alpha', status: 'active' } as any,
    })
    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Membership Beta', slug: 'membership-beta', status: 'active' } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'membership-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Membership Admin A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }],
      } as any,
    })
    adminB = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'membership-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Membership Admin B',
        platformRoles: ['user'],
        organizations: [{ organization: organizationB.id, roles: ['organization-admin'] }],
      } as any,
    })
    memberA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'membership-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Membership Member A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['member'] }],
      } as any,
    })

    contactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { displayName: 'Membership Contact Alpha', organization: organizationA.id } as any,
    })
    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(adminB)) as any,
      data: { displayName: 'Membership Contact Beta', organization: organizationB.id } as any,
    })

    typeA = await payload.create({
      collection: 'membership-types',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { name: 'Adhésion annuelle', organization: organizationA.id } as any,
    })
    typeB = await payload.create({
      collection: 'membership-types',
      overrideAccess: false,
      user: (await persistedRequestUser(adminB)) as any,
      data: { name: 'Adhésion annuelle', organization: organizationB.id } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('normalizes membership type keys while allowing the same key in different tenants', () => {
    expect(typeA.key).toBe('adhesion-annuelle')
    expect(typeB.key).toBe('adhesion-annuelle')
    expect(typeA.status).toBe('active')
  })

  test('rejects duplicate membership type keys inside one tenant', async () => {
    await expect(
      payload.create({
        collection: 'membership-types',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: { name: 'Adhesion annuelle', organization: organizationA.id } as any,
      }),
    ).rejects.toThrow(/key/i)
  })

  test('archives and restores membership types without deleting history', async () => {
    const archived = await payload.update({
      collection: 'membership-types',
      id: typeA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { status: 'archived' },
    })

    expect(archived.archivedAt).toEqual(expect.any(String))
    const archivedAt = archived.archivedAt

    const unchanged = await payload.update({
      collection: 'membership-types',
      id: typeA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { description: 'Historical annual membership type.' },
    })
    expect(unchanged.archivedAt).toBe(archivedAt)

    const restored = await payload.update({
      collection: 'membership-types',
      id: typeA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { status: 'active' },
    })
    expect(restored.archivedAt).toBeNull()
  })

  test('creates a tenant-safe membership with immutable creator attribution', async () => {
    const membership = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: {
        organization: organizationA.id,
        contact: contactA.id,
        membershipType: typeA.id,
        status: 'active',
        startsAt: '2026-09-01T00:00:00.000Z',
        endsAt: '2027-08-31T00:00:00.000Z',
        membershipNumber: ' A-0001 ',
      } as any,
    })

    expect(membership.membershipNumber).toBe('A-0001')
    expect(relationshipID(membership.contact)).toBe(contactA.id)
    expect(relationshipID(membership.membershipType)).toBe(typeA.id)
    expect(relationshipID(membership.createdBy)).toBe(adminA.id)

    const updated = await payload.update({
      collection: 'memberships',
      id: membership.id,
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: { status: 'suspended', createdBy: adminB.id } as any,
    })
    expect(updated.status).toBe('suspended')
    expect(relationshipID(updated.createdBy)).toBe(adminA.id)
  })

  test('rejects an end date before the start date', async () => {
    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: {
          organization: organizationA.id,
          contact: contactA.id,
          membershipType: typeA.id,
          startsAt: '2026-09-10T00:00:00.000Z',
          endsAt: '2026-09-09T00:00:00.000Z',
        } as any,
      }),
    ).rejects.toThrow(/endsAt|end date/i)
  })

  test('rejects cross-tenant Contact and Membership Type relationships', async () => {
    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: {
          organization: organizationA.id,
          contact: contactB.id,
          membershipType: typeA.id,
          startsAt: '2026-09-01T00:00:00.000Z',
        } as any,
      }),
    ).rejects.toThrow(/Contact/i)

    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: {
          organization: organizationA.id,
          contact: contactA.id,
          membershipType: typeB.id,
          startsAt: '2026-09-01T00:00:00.000Z',
        } as any,
      }),
    ).rejects.toThrow(/Membership Type/i)
  })

  test('enforces membership-number uniqueness per tenant while allowing reuse across tenants', async () => {
    await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: {
        organization: organizationA.id,
        contact: contactA.id,
        membershipType: typeA.id,
        startsAt: '2026-10-01T00:00:00.000Z',
        membershipNumber: 'SHARED-42',
      } as any,
    })

    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminA)) as any,
        data: {
          organization: organizationA.id,
          contact: contactA.id,
          membershipType: typeA.id,
          startsAt: '2026-11-01T00:00:00.000Z',
          membershipNumber: 'SHARED-42',
        } as any,
      }),
    ).rejects.toThrow(/membership number/i)

    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(adminB)) as any,
        data: {
          organization: organizationB.id,
          contact: contactB.id,
          membershipType: typeB.id,
          startsAt: '2026-10-01T00:00:00.000Z',
          membershipNumber: 'SHARED-42',
        } as any,
      }),
    ).resolves.toBeTruthy()
  })

  test('keeps membership data isolated and hidden from ordinary members', async () => {
    const alpha = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(adminA)) as any,
      data: {
        organization: organizationA.id,
        contact: contactA.id,
        membershipType: typeA.id,
        startsAt: '2026-12-01T00:00:00.000Z',
      } as any,
    })

    const betaView = await payload.find({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(adminB)) as any,
      limit: 50,
    })
    expect(betaView.docs.map((doc) => doc.id)).not.toContain(alpha.id)

    await expect(
      payload.find({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(memberA)) as any,
        limit: 20,
      }),
    ).rejects.toThrow()
  })
})
