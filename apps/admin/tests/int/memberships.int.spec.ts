import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends object>(user: T) => ({
  ...structuredClone(user),
  collection: 'users' as const,
})

const persistedRequestUser = async (payload: Payload, user: { id: number | string }) =>
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

describe('Membership types and lifecycle', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let editorA: any
  let memberA: any
  let personA: any
  let organizationContactA: any
  let contactB: any
  let typeA: any
  let typeB: any
  let membershipA: any
  let membershipB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Membership Association Alpha',
        slug: 'membership-association-alpha',
        status: 'active',
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Membership Association Beta',
        slug: 'membership-association-beta',
        status: 'active',
      } as any,
    })

    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'membership-bootstrap@assostack.test',
        password: 'test-password-123',
        name: 'Membership Bootstrap Admin',
        platformRoles: ['platform-admin'],
      } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'membership-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Membership Admin A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['organization-admin'],
          },
        ],
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
        organizations: [
          {
            organization: organizationB.id,
            roles: ['organization-admin'],
          },
        ],
      } as any,
    })

    editorA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'membership-editor-a@assostack.test',
        password: 'test-password-123',
        name: 'Membership Editor A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['editor'],
          },
        ],
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
        organizations: [
          {
            organization: organizationA.id,
            roles: ['member'],
          },
        ],
      } as any,
    })

    personA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        kind: 'person',
        displayName: 'Membership Person Alpha',
        organization: organizationA.id,
      } as any,
    })

    organizationContactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        kind: 'organization',
        displayName: 'Membership Company Alpha',
        organizationDetails: {
          name: 'Membership Company Alpha',
        },
        organization: organizationA.id,
      } as any,
    })

    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        kind: 'person',
        displayName: 'Membership Person Beta',
        organization: organizationB.id,
      } as any,
    })

    typeA = await payload.create({
      collection: 'membership-types',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        name: 'Adhésion Générale',
        organization: organizationA.id,
      } as any,
    })

    typeB = await payload.create({
      collection: 'membership-types',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        name: 'Adhésion Générale',
        organization: organizationB.id,
      } as any,
    })

    membershipA = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        organization: organizationA.id,
        contact: personA.id,
        membershipType: typeA.id,
        status: 'active',
        startsAt: '2026-09-01T00:00:00.000Z',
        endsAt: '2027-08-31T23:59:59.999Z',
        membershipNumber: ' A-0001 ',
      } as any,
    })

    membershipB = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        organization: organizationB.id,
        contact: contactB.id,
        membershipType: typeB.id,
        status: 'active',
        startsAt: '2026-09-01T00:00:00.000Z',
        membershipNumber: 'A-0001',
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('normalizes membership type keys while allowing the same key in different organizations', () => {
    expect(typeA.key).toBe('adhesion-generale')
    expect(typeB.key).toBe('adhesion-generale')
    expect(typeA.status).toBe('active')
  })

  test('rejects duplicate membership type keys in one organization', async () => {
    await expect(
      payload.create({
        collection: 'membership-types',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          name: 'Adhesion generale',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/key/i)
  })

  test('creates a membership with normalized number, lifecycle dates and immutable staff attribution', async () => {
    expect(membershipA.status).toBe('active')
    expect(membershipA.membershipNumber).toBe('A-0001')
    expect(relationshipID(membershipA.contact)).toBe(personA.id)
    expect(relationshipID(membershipA.membershipType)).toBe(typeA.id)
    expect(relationshipID(membershipA.createdBy)).toBe(adminA.id)

    const updated = await payload.update({
      collection: 'memberships',
      id: membershipA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        status: 'suspended',
        createdBy: editorA.id,
      } as any,
    })

    expect(updated.status).toBe('suspended')
    expect(relationshipID(updated.createdBy)).toBe(adminA.id)

    membershipA = await payload.update({
      collection: 'memberships',
      id: membershipA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        status: 'active',
      },
    })
  })

  test('supports organization Contacts as membership holders', async () => {
    const corporateMembership = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        organization: organizationA.id,
        contact: organizationContactA.id,
        membershipType: typeA.id,
        status: 'pending',
        startsAt: '2026-09-01T00:00:00.000Z',
        membershipNumber: 'ORG-001',
      } as any,
    })

    expect(relationshipID(corporateMembership.contact)).toBe(organizationContactA.id)
    expect(corporateMembership.status).toBe('pending')
  })

  test('allows the same membership number in another organization but rejects it in the same organization', async () => {
    expect(membershipB.membershipNumber).toBe('A-0001')

    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          organization: organizationA.id,
          contact: organizationContactA.id,
          membershipType: typeA.id,
          status: 'pending',
          startsAt: '2026-09-01T00:00:00.000Z',
          membershipNumber: 'A-0001',
        } as any,
      }),
    ).rejects.toThrow(/membershipNumber|membership number/i)
  })

  test('accepts multiple null membership numbers', async () => {
    const first = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        organization: organizationA.id,
        contact: personA.id,
        membershipType: typeA.id,
        status: 'pending',
        startsAt: '2028-01-01T00:00:00.000Z',
      } as any,
    })
    const second = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        organization: organizationA.id,
        contact: organizationContactA.id,
        membershipType: typeA.id,
        status: 'pending',
        startsAt: '2028-01-01T00:00:00.000Z',
        membershipNumber: '   ',
      } as any,
    })

    expect(first.membershipNumber ?? null).toBeNull()
    expect(second.membershipNumber ?? null).toBeNull()
  })

  test('rejects an end date before the start date', async () => {
    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          organization: organizationA.id,
          contact: personA.id,
          membershipType: typeA.id,
          status: 'pending',
          startsAt: '2027-09-01T00:00:00.000Z',
          endsAt: '2027-08-31T00:00:00.000Z',
        } as any,
      }),
    ).rejects.toThrow(/endsAt|end date|invalid/i)
  })

  test('rejects a Contact from another organization', async () => {
    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          organization: organizationA.id,
          contact: contactB.id,
          membershipType: typeA.id,
          status: 'pending',
          startsAt: '2027-09-01T00:00:00.000Z',
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('rejects a Membership Type from another organization', async () => {
    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          organization: organizationA.id,
          contact: personA.id,
          membershipType: typeB.id,
          status: 'pending',
          startsAt: '2027-09-01T00:00:00.000Z',
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('archives and restores membership types without changing historical memberships', async () => {
    const archived = await payload.update({
      collection: 'membership-types',
      id: typeA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        status: 'archived',
      },
    })

    expect(archived.status).toBe('archived')
    expect(archived.archivedAt).toEqual(expect.any(String))
    const archivedAt = archived.archivedAt

    const stillArchived = await payload.update({
      collection: 'membership-types',
      id: typeA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        description: 'Archived type retained for historical memberships.',
      },
    })

    expect(stillArchived.archivedAt).toBe(archivedAt)

    typeA = await payload.update({
      collection: 'membership-types',
      id: typeA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        status: 'active',
      },
    })

    expect(typeA.archivedAt).toBeNull()

    const historicalMembership = await payload.findByID({
      collection: 'memberships',
      id: membershipA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
    })
    expect(relationshipID(historicalMembership.membershipType)).toBe(typeA.id)
  })

  test('keeps membership types and memberships isolated between organizations', async () => {
    const typesA = await payload.find({
      collection: 'membership-types',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      limit: 100,
    })
    const membershipsA = await payload.find({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      limit: 100,
    })

    expect(typesA.docs.map((doc) => doc.id)).toContain(typeA.id)
    expect(typesA.docs.map((doc) => doc.id)).not.toContain(typeB.id)
    expect(membershipsA.docs.map((doc) => doc.id)).toContain(membershipA.id)
    expect(membershipsA.docs.map((doc) => doc.id)).not.toContain(membershipB.id)
  })

  test('does not expose membership administration to ordinary members', async () => {
    await expect(
      payload.find({
        collection: 'membership-types',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        limit: 20,
      }),
    ).rejects.toThrow()

    await expect(
      payload.find({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        limit: 20,
      }),
    ).rejects.toThrow()
  })
})
