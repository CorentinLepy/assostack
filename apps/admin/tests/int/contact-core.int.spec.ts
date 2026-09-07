import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

describe('CRM contact core', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'CRM Alpha',
        slug: 'crm-alpha',
        status: 'active',
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'CRM Beta',
        slug: 'crm-beta',
        status: 'active',
      } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'crm-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'CRM Admin A',
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
        email: 'crm-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'CRM Admin B',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationB.id,
            roles: ['organization-admin'],
          },
        ],
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('creates a structured person and derives its display name', async () => {
    const contact = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        kind: 'person',
        person: {
          firstName: '  Alice ',
          lastName: ' Martin  ',
        },
        email: 'alice.martin@example.test',
        address: {
          city: 'Lyon',
          countryCode: ' fr ',
          postalCode: '69001',
        },
        organization: organizationA.id,
      } as any,
    })

    expect(contact.kind).toBe('person')
    expect(contact.displayName).toBe('Alice Martin')
    expect(contact.status).toBe('active')
    expect(contact.address?.countryCode).toBe('FR')
  })

  test('creates an organization contact without coupling to association semantics', async () => {
    const contact = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        kind: 'organization',
        organizationDetails: {
          name: 'Example Partner',
          legalName: 'Example Partner SAS',
          registrationNumber: 'EXAMPLE-123',
          website: 'https://partner.example.test',
        },
        organization: organizationA.id,
      } as any,
    })

    expect(contact.kind).toBe('organization')
    expect(contact.displayName).toBe('Example Partner')
    expect(contact.organizationDetails?.legalName).toBe('Example Partner SAS')
  })

  test('rejects malformed country codes', async () => {
    await expect(
      payload.create({
        collection: 'contacts',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          displayName: 'Invalid Country',
          address: {
            countryCode: 'France',
          },
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('archives and restores a contact without deleting its CRM identity', async () => {
    const contact = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        displayName: 'Lifecycle Contact',
        organization: organizationA.id,
      } as any,
    })

    const archived = await payload.update({
      collection: 'contacts',
      id: contact.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        status: 'archived',
      },
    })

    expect(archived.status).toBe('archived')
    expect(archived.archivedAt).toEqual(expect.any(String))

    const restored = await payload.update({
      collection: 'contacts',
      id: contact.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        status: 'active',
      },
    })

    expect(restored.status).toBe('active')
    expect(restored.archivedAt).toBeNull()
    expect(restored.id).toBe(contact.id)
  })

  test('allows external migration references to overlap between tenants', async () => {
    const reference = 'legacy-contact-42'

    const contactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        displayName: 'Imported Alpha',
        externalReference: reference,
        organization: organizationA.id,
      } as any,
    })

    const contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      data: {
        displayName: 'Imported Beta',
        externalReference: reference,
        organization: organizationB.id,
      } as any,
    })

    expect(contactA.externalReference).toBe(reference)
    expect(contactB.externalReference).toBe(reference)
    expect(contactA.organization).not.toEqual(contactB.organization)
  })
})
