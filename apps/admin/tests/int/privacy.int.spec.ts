import { getOrganizationIDsForRoles } from '@/access/organizations'
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

describe('CRM privacy purposes and history', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let editorA: any
  let memberA: any
  let contactA: any
  let contactB: any
  let purposeA: any
  let purposeB: any
  let recordA: any
  let recordB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Privacy Association Alpha',
        slug: 'privacy-association-alpha',
        status: 'active',
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Privacy Association Beta',
        slug: 'privacy-association-beta',
        status: 'active',
      } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'privacy-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Privacy Admin A',
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
        email: 'privacy-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Privacy Admin B',
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
        email: 'privacy-editor-a@assostack.test',
        password: 'test-password-123',
        name: 'Privacy Editor A',
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
        email: 'privacy-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Privacy Member A',
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
      user: asRequestUser(adminA) as any,
      data: {
        displayName: 'Privacy Contact Alpha',
        email: 'privacy-contact-a@assostack.test',
        organization: organizationA.id,
      } as any,
    })

    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      data: {
        displayName: 'Privacy Contact Beta',
        email: 'privacy-contact-b@assostack.test',
        organization: organizationB.id,
      } as any,
    })

    purposeA = await payload.create({
      collection: 'privacy-purposes',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        name: 'Newsletter général',
        legalBasis: 'consent',
        organization: organizationA.id,
      } as any,
    })

    purposeB = await payload.create({
      collection: 'privacy-purposes',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      data: {
        name: 'Newsletter général',
        legalBasis: 'consent',
        organization: organizationB.id,
      } as any,
    })

    recordA = await payload.create({
      collection: 'privacy-records',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        organization: organizationA.id,
        contact: contactA.id,
        purpose: purposeA.id,
        eventType: 'granted',
        source: 'form',
        externalReference: 'form-submission-alpha-1',
      } as any,
    })

    recordB = await payload.create({
      collection: 'privacy-records',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      data: {
        organization: organizationB.id,
        contact: contactB.id,
        purpose: purposeB.id,
        eventType: 'basis-recorded',
        source: 'import',
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('normalizes purpose keys while allowing the same key in different organizations', () => {
    expect(purposeA.key).toBe('newsletter-general')
    expect(purposeB.key).toBe('newsletter-general')
    expect(purposeA.status).toBe('active')
    expect(purposeA.legalBasis).toBe('consent')
    expect(relationshipID(purposeA.organization)).toBe(organizationA.id)
    expect(relationshipID(purposeB.organization)).toBe(organizationB.id)
    expect(getOrganizationIDsForRoles(asRequestUser(adminA), ['organization-admin', 'editor'])).toEqual([
      organizationA.id,
    ])
  })

  test('rejects duplicate purpose keys inside one organization', async () => {
    await expect(
      payload.create({
        collection: 'privacy-purposes',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          name: 'Newsletter general',
          legalBasis: 'consent',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/key/i)
  })

  test('records append-only privacy events with effective time and immutable author attribution', async () => {
    expect(recordA.eventType).toBe('granted')
    expect(recordA.source).toBe('form')
    expect(recordA.effectiveAt).toEqual(expect.any(String))
    expect(relationshipID(recordA.contact)).toBe(contactA.id)
    expect(relationshipID(recordA.purpose)).toBe(purposeA.id)
    expect(relationshipID(recordA.createdBy)).toBe(adminA.id)

    await expect(
      payload.update({
        collection: 'privacy-records',
        id: recordA.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          note: 'Attempted mutation of historical evidence',
        },
      }),
    ).rejects.toThrow()
  })

  test('rejects a Contact from another organization', async () => {
    await expect(
      payload.create({
        collection: 'privacy-records',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          organization: organizationA.id,
          contact: contactB.id,
          purpose: purposeA.id,
          eventType: 'denied',
          source: 'manual',
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('rejects a Privacy Purpose from another organization', async () => {
    await expect(
      payload.create({
        collection: 'privacy-records',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          organization: organizationA.id,
          contact: contactA.id,
          purpose: purposeB.id,
          eventType: 'withdrawn',
          source: 'manual',
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('rejects expiry timestamps before the effective timestamp', async () => {
    await expect(
      payload.create({
        collection: 'privacy-records',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          organization: organizationA.id,
          contact: contactA.id,
          purpose: purposeA.id,
          eventType: 'granted',
          source: 'api',
          effectiveAt: '2026-09-07T12:00:00.000Z',
          expiresAt: '2026-09-06T12:00:00.000Z',
        } as any,
      }),
    ).rejects.toThrow(/expiresAt|expiry|invalid/i)
  })

  test('rejects unsupported privacy event values', async () => {
    await expect(
      payload.create({
        collection: 'privacy-records',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          organization: organizationA.id,
          contact: contactA.id,
          purpose: purposeA.id,
          eventType: 'subscribed-somewhere-else',
          source: 'manual',
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('manages Privacy Purpose archive and restore timestamps without deleting history', async () => {
    const archived = await payload.update({
      collection: 'privacy-purposes',
      id: purposeA.id,
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
      collection: 'privacy-purposes',
      id: purposeA.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        description: 'Archived without rewriting historical Privacy Records.',
      },
    })

    expect(stillArchived.archivedAt).toBe(archivedAt)

    const restored = await payload.update({
      collection: 'privacy-purposes',
      id: purposeA.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        status: 'active',
      },
    })

    expect(restored.status).toBe('active')
    expect(restored.archivedAt).toBeNull()
  })

  test('keeps Privacy Purpose and Record reads isolated between organizations', async () => {
    expect(getOrganizationIDsForRoles(asRequestUser(adminA), ['organization-admin', 'editor'])).toEqual([
      organizationA.id,
    ])

    const purposesA = await payload.find({
      collection: 'privacy-purposes',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      limit: 50,
    })
    const recordsA = await payload.find({
      collection: 'privacy-records',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      limit: 50,
    })

    expect(purposesA.docs.map((doc) => doc.id)).toContain(purposeA.id)
    expect(purposesA.docs.map((doc) => doc.id)).not.toContain(purposeB.id)
    expect(recordsA.docs.map((doc) => doc.id)).toContain(recordA.id)
    expect(recordsA.docs.map((doc) => doc.id)).not.toContain(recordB.id)
  })

  test('only organization administrators may delete Privacy Records through normal CRM access', async () => {
    await expect(
      payload.delete({
        collection: 'privacy-records',
        id: recordA.id,
        overrideAccess: false,
        user: asRequestUser(editorA) as any,
      }),
    ).rejects.toThrow()

    const exceptional = await payload.create({
      collection: 'privacy-records',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        organization: organizationA.id,
        contact: contactA.id,
        purpose: purposeA.id,
        eventType: 'basis-recorded',
        source: 'manual',
        note: 'Disposable record used to verify exceptional admin deletion.',
      } as any,
    })

    await expect(
      payload.delete({
        collection: 'privacy-records',
        id: exceptional.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
      }),
    ).resolves.toBeTruthy()
  })

  test('does not expose privacy taxonomy or history to ordinary members', async () => {
    await expect(
      payload.find({
        collection: 'privacy-purposes',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
        limit: 20,
      }),
    ).rejects.toThrow()

    await expect(
      payload.find({
        collection: 'privacy-records',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
        limit: 20,
      }),
    ).rejects.toThrow()
  })
})
