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

describe('CRM interactions', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let memberA: any
  let contactA1: any
  let contactA2: any
  let contactB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Interaction Alpha',
        slug: 'interaction-alpha',
        status: 'active',
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Interaction Beta',
        slug: 'interaction-beta',
        status: 'active',
      } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'interaction-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Interaction Admin A',
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
        email: 'interaction-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Interaction Admin B',
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
        email: 'interaction-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Interaction Member A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['member'],
          },
        ],
      } as any,
    })

    contactA1 = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        displayName: 'Alpha Person',
        organization: organizationA.id,
      } as any,
    })

    contactA2 = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        kind: 'organization',
        displayName: 'Alpha Partner',
        organizationDetails: {
          name: 'Alpha Partner',
        },
        organization: organizationA.id,
      } as any,
    })

    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      data: {
        displayName: 'Beta Person',
        organization: organizationB.id,
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('creates a timeline entry for multiple contacts in the same organization', async () => {
    const occurredAt = '2026-09-07T07:00:00.000Z'
    const interaction = await payload.create({
      collection: 'interactions',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        kind: 'meeting',
        occurredAt,
        subject: 'Partnership planning meeting',
        contacts: [contactA1.id, contactA2.id],
        externalReference: 'legacy-interaction-1',
        organization: organizationA.id,
      } as any,
    })

    expect(interaction.kind).toBe('meeting')
    expect(interaction.occurredAt).toBe(occurredAt)
    expect(interaction.contacts.map(relationshipID)).toEqual(
      expect.arrayContaining([contactA1.id, contactA2.id]),
    )
    expect(relationshipID(interaction.createdBy)).toBe(adminA.id)
    expect(interaction.externalReference).toBe('legacy-interaction-1')
  })

  test('keeps createdBy immutable when staff update an interaction', async () => {
    const interaction = await payload.create({
      collection: 'interactions',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        kind: 'note',
        subject: 'Original attributed note',
        contacts: [contactA1.id],
        organization: organizationA.id,
      } as any,
    })

    const updated = await payload.update({
      collection: 'interactions',
      id: interaction.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        subject: 'Updated attributed note',
        createdBy: adminB.id,
      } as any,
    })

    expect(updated.subject).toBe('Updated attributed note')
    expect(relationshipID(updated.createdBy)).toBe(adminA.id)
  })

  test('rejects cross-tenant contacts even when an interaction tenant is crafted manually', async () => {
    await expect(
      payload.create({
        collection: 'interactions',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          kind: 'note',
          subject: 'Forbidden cross-tenant relationship',
          contacts: [contactB.id],
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('rejects mixing same-tenant and cross-tenant contacts', async () => {
    await expect(
      payload.create({
        collection: 'interactions',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          kind: 'email',
          direction: 'outbound',
          subject: 'Mixed relationship attempt',
          contacts: [contactA1.id, contactB.id],
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('prevents moving an existing interaction onto another tenant contact', async () => {
    const interaction = await payload.create({
      collection: 'interactions',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        kind: 'phone-call',
        direction: 'inbound',
        subject: 'Alpha phone call',
        contacts: [contactA1.id],
        organization: organizationA.id,
      } as any,
    })

    await expect(
      payload.update({
        collection: 'interactions',
        id: interaction.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          contacts: [contactB.id],
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('keeps interaction history isolated from another organization', async () => {
    const alphaInteraction = await payload.create({
      collection: 'interactions',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        kind: 'note',
        subject: 'Alpha internal note',
        contacts: [contactA1.id],
        organization: organizationA.id,
      } as any,
    })

    const resultA = await payload.find({
      collection: 'interactions',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      limit: 50,
    })
    const resultB = await payload.find({
      collection: 'interactions',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      limit: 50,
    })

    expect(resultA.docs.map((doc) => doc.id)).toContain(alphaInteraction.id)
    expect(resultB.docs.map((doc) => doc.id)).not.toContain(alphaInteraction.id)
  })

  test('does not expose staff CRM history to ordinary members', async () => {
    await expect(
      payload.find({
        collection: 'interactions',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
        limit: 20,
      }),
    ).rejects.toThrow()
  })
})
