import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

describe('tenant isolation', () => {
  let organizationA: any
  let organizationB: any
  let platformAdmin: any
  let adminA: any
  let memberA: any
  let adminB: any
  let unassignedUser: any
  let contactA: any
  let contactB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    platformAdmin = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'platform-admin@assostack.test',
        password: 'test-password-123',
        name: 'Platform Admin',
        platformRoles: ['platform-admin'],
      } as any,
    })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Association Alpha',
        slug: 'association-alpha',
        status: 'active',
      },
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Association Beta',
        slug: 'association-beta',
        status: 'active',
      },
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Admin A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['organization-admin'],
          },
        ],
      } as any,
    })

    memberA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'member-a@assostack.test',
        password: 'test-password-123',
        name: 'Member A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['member'],
          },
        ],
      } as any,
    })

    adminB = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Admin B',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationB.id,
            roles: ['organization-admin'],
          },
        ],
      } as any,
    })

    unassignedUser = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'unassigned@assostack.test',
        password: 'test-password-123',
        name: 'Unassigned User',
        platformRoles: ['user'],
        organizations: [],
      } as any,
    })

    contactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(platformAdmin) as any,
      data: {
        displayName: 'Alpha Contact',
        email: 'alpha@example.test',
        organization: organizationA.id,
      } as any,
    })

    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(platformAdmin) as any,
      data: {
        displayName: 'Beta Contact',
        email: 'beta@example.test',
        organization: organizationB.id,
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('bootstraps the first user as a platform admin', () => {
    expect(platformAdmin.platformRoles).toContain('platform-admin')
  })

  test('scopes organization admins to their own organization', async () => {
    const result = await payload.find({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      limit: 20,
    })

    expect(result.docs.map((doc) => doc.id)).toContain(contactA.id)
    expect(result.docs.map((doc) => doc.id)).not.toContain(contactB.id)
  })

  test('denies cross-tenant updates', async () => {
    await expect(
      payload.update({
        collection: 'contacts',
        id: contactB.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          displayName: 'Attempted cross-tenant edit',
        },
      }),
    ).rejects.toThrow()
  })

  test('denies cross-tenant creates even when the tenant id is crafted manually', async () => {
    await expect(
      payload.create({
        collection: 'contacts',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          displayName: 'Forbidden Beta Contact',
          organization: organizationB.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('keeps member role read-only', async () => {
    const result = await payload.find({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(memberA) as any,
      limit: 20,
    })

    expect(result.docs.map((doc) => doc.id)).toContain(contactA.id)

    await expect(
      payload.update({
        collection: 'contacts',
        id: contactA.id,
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
        data: {
          displayName: 'Member edit attempt',
        },
      }),
    ).rejects.toThrow()
  })

  test('gives a user with no organization no tenant-scoped data', async () => {
    const result = await payload.find({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(unassignedUser) as any,
      limit: 20,
    })

    expect(result.docs).toHaveLength(0)
  })

  test('keeps another organization isolated in the opposite direction', async () => {
    const result = await payload.find({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      limit: 20,
    })

    expect(result.docs.map((doc) => doc.id)).toContain(contactB.id)
    expect(result.docs.map((doc) => doc.id)).not.toContain(contactA.id)
  })

  test('allows platform admins to operate across organizations', async () => {
    const result = await payload.find({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(platformAdmin) as any,
      limit: 20,
    })

    expect(result.docs.map((doc) => doc.id)).toEqual(expect.arrayContaining([contactA.id, contactB.id]))
  })
})
