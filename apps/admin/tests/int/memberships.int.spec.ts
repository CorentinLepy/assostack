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

describe('CRM memberships', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let editorA: any
  let memberA: any
  let contactA: any
  let organizationContactA: any
  let contactB: any
  let typeA: any
  let typeB: any
  let membershipA: any

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
        name: 'Membership Bootstrap Fixture',
        platformRoles: ['user'],
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

    contactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        displayName: 'Membership Person Alpha',
        kind: 'person',
        organization: organizationA.id,
      } as any,
    })

    organizationContactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        displayName: 'Membership Organization Alpha',
        kind: 'organization',
        organizationDetails: {
          name: 'Membership Organization Alpha',
        },
        organization: organizationA.id,
      } as any,
    })

    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        displayName: 'Membership Person Beta',
        kind: 'person',
        organization: organizationB.id,
      } as any,
    })

    typeA = await payload.create({
      collection: 'membership-types',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        name: 'Adhésion générale',
        organization: organizationA.id,
      } as any,
    })

    typeB = await payload.create({
      collection: 'membership-types',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        name: 'Adhésion générale',
        organization: organizationB.id,
      } as any,
    })

    membershipA = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        contact: contactA.id,
        membershipType: typeA.id,
        status: 'active',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-12-31T00:00:00.000Z',
        membershipNumber: '  A-001  ',
        externalReference: 'fixture-membership-a',
        organization: organizationA.id,
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('normalizes type keys while allowing the same key in different organizations', () => {
    expect(typeA.key).toBe('adhesion-generale')
    expect(typeB.key).toBe('adhesion-generale')
    expect(typeA.status).toBe('active')
    expect(relationshipID(typeA.organization)).toBe(organizationA.id)
    expect(relationshipID(typeB.organization)).toBe(organizationB.id)
  })

  test('rejects duplicate membership type keys inside one organization', async () => {
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

  test('creates a membership with normalized number and immutable staff attribution', async () => {
    expect(membershipA.membershipNumber).toBe('A-001')
    expect(membershipA.status).toBe('active')
    expect(relationshipID(membershipA.contact)).toBe(contactA.id)
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
  })

  test('supports organization Contacts without duplicating identity', async () => {
    const corporateMembership = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        contact: organizationContactA.id,
        membershipType: typeA.id,
        status: 'pending',
        startsAt: '2026-02-01T00:00:00.000Z',
        membershipNumber: 'ORG-001',
        organization: organizationA.id,
      } as any,
    })

    expect(relationshipID(corporateMembership.contact)).toBe(organizationContactA.id)
    expect(relationshipID(corporateMembership.createdBy)).toBe(editorA.id)
  })

  test('rejects a Contact from another organization', async () => {
    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          contact: contactB.id,
          membershipType: typeA.id,
          startsAt: '2026-03-01T00:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/Contact/i)
  })

  test('rejects a Membership Type from another organization', async () => {
    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          contact: contactA.id,
          membershipType: typeB.id,
          startsAt: '2026-03-01T00:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/membershipType/i)
  })

  test('rejects an end date before the start date', async () => {
    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          contact: contactA.id,
          membershipType: typeA.id,
          startsAt: '2026-06-01T00:00:00.000Z',
          endsAt: '2026-05-31T00:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/endsAt/i)
  })

  test('enforces membership number uniqueness per organization only', async () => {
    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          contact: contactA.id,
          membershipType: typeA.id,
          startsAt: '2026-04-01T00:00:00.000Z',
          membershipNumber: ' A-001 ',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/membershipNumber/i)

    const sameNumberOtherTenant = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        contact: contactB.id,
        membershipType: typeB.id,
        startsAt: '2026-04-01T00:00:00.000Z',
        membershipNumber: 'A-001',
        organization: organizationB.id,
      } as any,
    })

    expect(sameNumberOtherTenant.membershipNumber).toBe('A-001')
  })

  test('allows multiple memberships without a membership number', async () => {
    const first = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        contact: contactA.id,
        membershipType: typeA.id,
        startsAt: '2027-01-01T00:00:00.000Z',
        membershipNumber: '   ',
        organization: organizationA.id,
      } as any,
    })

    const second = await payload.create({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        contact: organizationContactA.id,
        membershipType: typeA.id,
        startsAt: '2027-01-01T00:00:00.000Z',
        organization: organizationA.id,
      } as any,
    })

    expect(first.membershipNumber).toBeNull()
    expect(second.membershipNumber ?? null).toBeNull()
  })

  test('archives and restores membership types without deleting referenced taxonomy', async () => {
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
        description: 'Historical membership taxonomy',
      },
    })

    expect(stillArchived.archivedAt).toBe(archivedAt)

    const restored = await payload.update({
      collection: 'membership-types',
      id: typeA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        status: 'active',
      },
    })

    expect(restored.status).toBe('active')
    expect(restored.archivedAt).toBeNull()
  })

  test('keeps membership type and membership reads isolated between organizations', async () => {
    const typesA = await payload.find({
      collection: 'membership-types',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      limit: 50,
    })
    const membershipsA = await payload.find({
      collection: 'memberships',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      limit: 50,
    })

    expect(typesA.docs.map((doc) => doc.id)).toContain(typeA.id)
    expect(typesA.docs.map((doc) => doc.id)).not.toContain(typeB.id)
    expect(membershipsA.docs.map((doc) => doc.id)).toContain(membershipA.id)
    expect(
      membershipsA.docs.every(
        (doc) => String(relationshipID(doc.organization)) === String(organizationA.id),
      ),
    ).toBe(true)
  })

  test('does not expose membership taxonomy or lifecycle to ordinary members', async () => {
    await expect(
      payload.find({
        collection: 'membership-types',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        limit: 50,
      }),
    ).rejects.toThrow()

    await expect(
      payload.find({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        limit: 50,
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'memberships',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        data: {
          contact: contactA.id,
          membershipType: typeA.id,
          startsAt: '2026-05-01T00:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })
})
