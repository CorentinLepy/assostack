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

describe('CRM contact tags', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let memberA: any
  let tagA: any
  let tagB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Tag Association Alpha',
        slug: 'tag-association-alpha',
        status: 'active',
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Tag Association Beta',
        slug: 'tag-association-beta',
        status: 'active',
      } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'tag-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Tag Admin A',
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
        email: 'tag-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Tag Admin B',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationB.id,
            roles: ['organization-admin'],
          },
        ],
      } as any,
    })

    memberA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'tag-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Tag Member A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['member'],
          },
        ],
      } as any,
    })

    tagA = await payload.create({
      collection: 'contact-tags',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        name: 'Bénévole événement',
        organization: organizationA.id,
      } as any,
    })

    tagB = await payload.create({
      collection: 'contact-tags',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      data: {
        name: 'Bénévole événement',
        organization: organizationB.id,
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('normalizes tag slugs while allowing the same slug in different organizations', () => {
    expect(tagA.slug).toBe('benevole-evenement')
    expect(tagB.slug).toBe('benevole-evenement')
    expect(tagA.status).toBe('active')
  })

  test('rejects duplicate tag slugs inside one organization', async () => {
    await expect(
      payload.create({
        collection: 'contact-tags',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          name: 'Benevole evenement',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/slug/i)
  })

  test('assigns multiple same-tenant tags to one Contact', async () => {
    const secondTag = await payload.create({
      collection: 'contact-tags',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        name: 'Partenaire potentiel',
        organization: organizationA.id,
      } as any,
    })

    const contact = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        displayName: 'Tagged Contact',
        tags: [tagA.id, secondTag.id],
        organization: organizationA.id,
      } as any,
    })

    expect((contact.tags ?? []).map(relationshipID)).toEqual(
      expect.arrayContaining([tagA.id, secondTag.id]),
    )
  })

  test('rejects assigning a Tag from another organization', async () => {
    await expect(
      payload.create({
        collection: 'contacts',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          displayName: 'Cross-tenant Tag Attempt',
          tags: [tagB.id],
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('rejects mixing valid and cross-tenant Tags', async () => {
    await expect(
      payload.create({
        collection: 'contacts',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          displayName: 'Mixed Tag Attempt',
          tags: [tagA.id, tagB.id],
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('manages archive and restore timestamps without deleting taxonomy records', async () => {
    const archived = await payload.update({
      collection: 'contact-tags',
      id: tagA.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        status: 'archived',
      },
    })

    expect(archived.status).toBe('archived')
    expect(archived.archivedAt).toEqual(expect.any(String))

    const archivedAt = archived.archivedAt
    const stillArchived = await payload.update({
      collection: 'contact-tags',
      id: tagA.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        description: 'Historical volunteer classification',
      },
    })

    expect(stillArchived.archivedAt).toBe(archivedAt)

    const restored = await payload.update({
      collection: 'contact-tags',
      id: tagA.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        status: 'active',
      },
    })

    expect(restored.status).toBe('active')
    expect(restored.archivedAt).toBeNull()
  })

  test('keeps tag reads isolated between organizations', async () => {
    const resultA = await payload.find({
      collection: 'contact-tags',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      limit: 50,
    })
    const resultB = await payload.find({
      collection: 'contact-tags',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      limit: 50,
    })

    expect(resultA.docs.map((doc) => doc.id)).toContain(tagA.id)
    expect(resultA.docs.map((doc) => doc.id)).not.toContain(tagB.id)
    expect(resultB.docs.map((doc) => doc.id)).toContain(tagB.id)
    expect(resultB.docs.map((doc) => doc.id)).not.toContain(tagA.id)
  })

  test('does not expose CRM taxonomy to ordinary members', async () => {
    await expect(
      payload.find({
        collection: 'contact-tags',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
        limit: 20,
      }),
    ).rejects.toThrow()
  })
})
