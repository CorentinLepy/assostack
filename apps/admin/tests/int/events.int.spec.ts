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

describe('Events and registrations', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let editorA: any
  let memberA: any
  let contactA: any
  let organizationContactA: any
  let contactB: any
  let eventA: any
  let eventB: any
  let registrationA: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Event Association Alpha',
        slug: 'event-association-alpha',
        status: 'active',
        settings: {
          locale: 'fr-FR',
          timezone: 'Europe/Paris',
        },
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Event Association Beta',
        slug: 'event-association-beta',
        status: 'active',
        settings: {
          locale: 'en-US',
          timezone: 'America/New_York',
        },
      } as any,
    })

    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'event-bootstrap@assostack.test',
        password: 'test-password-123',
        name: 'Event Bootstrap Fixture',
        platformRoles: ['user'],
      } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'event-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Event Admin A',
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
        email: 'event-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Event Admin B',
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
        email: 'event-editor-a@assostack.test',
        password: 'test-password-123',
        name: 'Event Editor A',
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
        email: 'event-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Event Member A',
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
        displayName: 'Event Person Alpha',
        kind: 'person',
        organization: organizationA.id,
      } as any,
    })

    organizationContactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        displayName: 'Event Organization Alpha',
        kind: 'organization',
        organizationDetails: {
          name: 'Event Organization Alpha',
        },
        organization: organizationA.id,
      } as any,
    })

    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        displayName: 'Event Person Beta',
        kind: 'person',
        organization: organizationB.id,
      } as any,
    })

    eventA = await payload.create({
      collection: 'events',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        title: 'Assemblée générale 2026',
        status: 'scheduled',
        startsAt: '2026-11-14T08:00:00.000Z',
        endsAt: '2026-11-14T12:00:00.000Z',
        capacity: 120,
        location: {
          name: 'Salle Alpha',
          city: 'Paris',
          country: 'FR',
        },
        organization: organizationA.id,
      } as any,
    })

    eventB = await payload.create({
      collection: 'events',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        title: 'Assemblée générale 2026',
        status: 'scheduled',
        startsAt: '2026-11-14T14:00:00.000Z',
        organization: organizationB.id,
      } as any,
    })

    registrationA = await payload.create({
      collection: 'event-registrations',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        event: eventA.id,
        contact: contactA.id,
        status: 'confirmed',
        source: 'form',
        externalReference: 'fixture-registration-a',
        organization: organizationA.id,
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('normalizes tenant-local event keys and defaults timezone from the organization', () => {
    expect(eventA.key).toBe('assemblee-generale-2026')
    expect(eventB.key).toBe('assemblee-generale-2026')
    expect(eventA.timezone).toBe('Europe/Paris')
    expect(eventB.timezone).toBe('America/New_York')
    expect(eventA.capacity).toBe(120)
  })

  test('rejects duplicate event keys inside one organization', async () => {
    await expect(
      payload.create({
        collection: 'events',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          title: 'Assemblee generale 2026',
          startsAt: '2026-12-01T09:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/key/i)
  })

  test('rejects an invalid explicit timezone', async () => {
    await expect(
      payload.create({
        collection: 'events',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          title: 'Invalid timezone fixture',
          startsAt: '2026-12-02T09:00:00.000Z',
          timezone: 'Mars/Olympus_Mons',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/timezone/i)
  })

  test('rejects an end timestamp before the start timestamp', async () => {
    await expect(
      payload.create({
        collection: 'events',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          title: 'Invalid date fixture',
          startsAt: '2026-12-03T12:00:00.000Z',
          endsAt: '2026-12-03T11:59:59.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/endsAt/i)
  })

  test('requires event capacity to be a positive whole number when present', async () => {
    await expect(
      payload.create({
        collection: 'events',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          title: 'Zero capacity fixture',
          startsAt: '2026-12-04T09:00:00.000Z',
          capacity: 0,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/capacity/i)

    await expect(
      payload.create({
        collection: 'events',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          title: 'Fractional capacity fixture',
          startsAt: '2026-12-05T09:00:00.000Z',
          capacity: 1.5,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/capacity/i)
  })

  test('keeps the event creator immutable across staff updates', async () => {
    expect(relationshipID(eventA.createdBy)).toBe(adminA.id)

    const updated = await payload.update({
      collection: 'events',
      id: eventA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        description: 'Updated by an editor',
        createdBy: editorA.id,
      } as any,
    })

    expect(relationshipID(updated.createdBy)).toBe(adminA.id)
  })

  test('creates a person registration with immutable staff attribution', async () => {
    expect(registrationA.status).toBe('confirmed')
    expect(registrationA.source).toBe('form')
    expect(relationshipID(registrationA.event)).toBe(eventA.id)
    expect(relationshipID(registrationA.contact)).toBe(contactA.id)
    expect(relationshipID(registrationA.createdBy)).toBe(adminA.id)

    const updated = await payload.update({
      collection: 'event-registrations',
      id: registrationA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        status: 'attended',
        createdBy: editorA.id,
      } as any,
    })

    expect(updated.status).toBe('attended')
    expect(relationshipID(updated.createdBy)).toBe(adminA.id)
  })

  test('supports organization Contacts as event registrants', async () => {
    const registration = await payload.create({
      collection: 'event-registrations',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        event: eventA.id,
        contact: organizationContactA.id,
        status: 'pending',
        source: 'manual',
        organization: organizationA.id,
      } as any,
    })

    expect(relationshipID(registration.contact)).toBe(organizationContactA.id)
    expect(relationshipID(registration.createdBy)).toBe(editorA.id)
  })

  test('keeps one current registration record per Event and Contact', async () => {
    const cancelled = await payload.update({
      collection: 'event-registrations',
      id: registrationA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        status: 'cancelled',
      },
    })

    expect(cancelled.status).toBe('cancelled')

    await expect(
      payload.create({
        collection: 'event-registrations',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          event: eventA.id,
          contact: contactA.id,
          status: 'pending',
          source: 'manual',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/contact/i)
  })

  test('rejects an Event from another organization', async () => {
    await expect(
      payload.create({
        collection: 'event-registrations',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          event: eventB.id,
          contact: contactA.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/event/i)
  })

  test('rejects a Contact from another organization', async () => {
    await expect(
      payload.create({
        collection: 'event-registrations',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          event: eventA.id,
          contact: contactB.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/contact/i)
  })

  test('keeps Event and Registration reads isolated between organizations', async () => {
    const eventsA = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      limit: 50,
    })
    const eventsB = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      limit: 50,
    })
    const registrationsA = await payload.find({
      collection: 'event-registrations',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      limit: 50,
    })

    expect(eventsA.docs.map((doc) => doc.id)).toContain(eventA.id)
    expect(eventsA.docs.map((doc) => doc.id)).not.toContain(eventB.id)
    expect(eventsB.docs.map((doc) => doc.id)).toContain(eventB.id)
    expect(eventsB.docs.map((doc) => doc.id)).not.toContain(eventA.id)
    expect(
      registrationsA.docs.every(
        (doc) => String(relationshipID(doc.organization)) === String(organizationA.id),
      ),
    ).toBe(true)
  })

  test('denies ordinary members broad staff-side Event and Registration access', async () => {
    await expect(
      payload.find({
        collection: 'events',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        limit: 50,
      }),
    ).rejects.toThrow()

    await expect(
      payload.find({
        collection: 'event-registrations',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        limit: 50,
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'events',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        data: {
          title: 'Forbidden member event',
          startsAt: '2026-12-06T09:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('preserves registration history by refusing deletion of referenced Events', async () => {
    await expect(
      payload.delete({
        collection: 'events',
        id: eventA.id,
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
      }),
    ).rejects.toThrow()

    const disposable = await payload.create({
      collection: 'events',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        title: 'Disposable event fixture',
        startsAt: '2026-12-07T09:00:00.000Z',
        organization: organizationA.id,
      } as any,
    })

    const deleted = await payload.delete({
      collection: 'events',
      id: disposable.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
    })

    expect(deleted.id).toBe(disposable.id)
  })
})
