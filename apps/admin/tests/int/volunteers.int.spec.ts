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

describe('Volunteer shifts and assignments', () => {
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
  let secondEventA: any
  let eventB: any
  let shiftA: any
  let shiftB: any
  let assignmentA: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Volunteer Association Alpha',
        slug: 'volunteer-association-alpha',
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
        name: 'Volunteer Association Beta',
        slug: 'volunteer-association-beta',
        status: 'active',
      } as any,
    })

    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'volunteer-bootstrap@assostack.test',
        password: 'test-password-123',
        name: 'Volunteer Bootstrap Fixture',
        platformRoles: ['user'],
      } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'volunteer-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Volunteer Admin A',
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
        email: 'volunteer-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Volunteer Admin B',
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
        email: 'volunteer-editor-a@assostack.test',
        password: 'test-password-123',
        name: 'Volunteer Editor A',
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
        email: 'volunteer-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Volunteer Member A',
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
        displayName: 'Volunteer Person Alpha',
        kind: 'person',
        organization: organizationA.id,
      } as any,
    })

    organizationContactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        displayName: 'Volunteer Organization Alpha',
        kind: 'organization',
        organizationDetails: {
          name: 'Volunteer Organization Alpha',
        },
        organization: organizationA.id,
      } as any,
    })

    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        displayName: 'Volunteer Person Beta',
        kind: 'person',
        organization: organizationB.id,
      } as any,
    })

    eventA = await payload.create({
      collection: 'events',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        title: 'Volunteer Event Alpha',
        status: 'scheduled',
        startsAt: '2027-02-10T08:00:00.000Z',
        endsAt: '2027-02-10T18:00:00.000Z',
        organization: organizationA.id,
      } as any,
    })

    secondEventA = await payload.create({
      collection: 'events',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        title: 'Volunteer Event Alpha Two',
        status: 'scheduled',
        startsAt: '2027-03-10T08:00:00.000Z',
        endsAt: '2027-03-10T18:00:00.000Z',
        organization: organizationA.id,
      } as any,
    })

    eventB = await payload.create({
      collection: 'events',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        title: 'Volunteer Event Beta',
        status: 'scheduled',
        startsAt: '2027-02-10T08:00:00.000Z',
        endsAt: '2027-02-10T18:00:00.000Z',
        organization: organizationB.id,
      } as any,
    })

    shiftA = await payload.create({
      collection: 'volunteer-shifts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        event: eventA.id,
        name: 'Accueil public',
        status: 'open',
        startsAt: '2027-02-10T07:30:00.000Z',
        endsAt: '2027-02-10T12:00:00.000Z',
        capacity: 8,
        locationName: 'Entrée principale',
        organization: organizationA.id,
      } as any,
    })

    shiftB = await payload.create({
      collection: 'volunteer-shifts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      data: {
        event: eventB.id,
        name: 'Accueil public',
        status: 'open',
        startsAt: '2027-02-10T07:30:00.000Z',
        endsAt: '2027-02-10T12:00:00.000Z',
        organization: organizationB.id,
      } as any,
    })

    assignmentA = await payload.create({
      collection: 'volunteer-assignments',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        shift: shiftA.id,
        contact: contactA.id,
        status: 'confirmed',
        source: 'form',
        externalReference: 'fixture-volunteer-a',
        organization: organizationA.id,
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('normalizes shift keys and permits the same key in another tenant', () => {
    expect(shiftA.key).toBe('accueil-public')
    expect(shiftB.key).toBe('accueil-public')
    expect(relationshipID(shiftA.event)).toBe(eventA.id)
    expect(relationshipID(shiftB.event)).toBe(eventB.id)
  })

  test('scopes shift key uniqueness to the parent Event', async () => {
    await expect(
      payload.create({
        collection: 'volunteer-shifts',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          event: eventA.id,
          name: 'Accueil public',
          startsAt: '2027-02-10T12:00:00.000Z',
          endsAt: '2027-02-10T16:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/key/i)

    const sameKeyOtherEvent = await payload.create({
      collection: 'volunteer-shifts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        event: secondEventA.id,
        name: 'Accueil public',
        startsAt: '2027-03-10T08:00:00.000Z',
        endsAt: '2027-03-10T12:00:00.000Z',
        organization: organizationA.id,
      } as any,
    })

    expect(sameKeyOtherEvent.key).toBe('accueil-public')
  })

  test('allows setup and cleanup shifts outside the parent Event window', async () => {
    const setup = await payload.create({
      collection: 'volunteer-shifts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        event: eventA.id,
        name: 'Montage pré-événement',
        startsAt: '2027-02-09T16:00:00.000Z',
        endsAt: '2027-02-09T20:00:00.000Z',
        organization: organizationA.id,
      } as any,
    })

    expect(relationshipID(setup.event)).toBe(eventA.id)
  })

  test('rejects a parent Event from another organization', async () => {
    await expect(
      payload.create({
        collection: 'volunteer-shifts',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          event: eventB.id,
          name: 'Cross tenant shift',
          startsAt: '2027-02-10T08:00:00.000Z',
          endsAt: '2027-02-10T10:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/event/i)
  })

  test('requires the shift end timestamp to be strictly after start', async () => {
    await expect(
      payload.create({
        collection: 'volunteer-shifts',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          event: eventA.id,
          name: 'Zero duration shift',
          startsAt: '2027-02-10T13:00:00.000Z',
          endsAt: '2027-02-10T13:00:00.000Z',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/endsAt/i)
  })

  test('requires optional shift capacity to be a positive whole number', async () => {
    await expect(
      payload.create({
        collection: 'volunteer-shifts',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          event: eventA.id,
          name: 'Invalid capacity shift',
          startsAt: '2027-02-10T13:00:00.000Z',
          endsAt: '2027-02-10T15:00:00.000Z',
          capacity: 1.5,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/capacity/i)
  })

  test('keeps the shift creator immutable across staff updates', async () => {
    expect(relationshipID(shiftA.createdBy)).toBe(adminA.id)

    const updated = await payload.update({
      collection: 'volunteer-shifts',
      id: shiftA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        instructions: 'Updated by editor',
        createdBy: editorA.id,
      } as any,
    })

    expect(relationshipID(updated.createdBy)).toBe(adminA.id)
  })

  test('creates person assignments and keeps author attribution immutable', async () => {
    expect(assignmentA.status).toBe('confirmed')
    expect(assignmentA.source).toBe('form')
    expect(relationshipID(assignmentA.shift)).toBe(shiftA.id)
    expect(relationshipID(assignmentA.contact)).toBe(contactA.id)
    expect(relationshipID(assignmentA.createdBy)).toBe(adminA.id)

    const updated = await payload.update({
      collection: 'volunteer-assignments',
      id: assignmentA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        status: 'completed',
        createdBy: editorA.id,
      } as any,
    })

    expect(updated.status).toBe('completed')
    expect(relationshipID(updated.createdBy)).toBe(adminA.id)
  })

  test('supports organization Contacts as generic volunteer assignees', async () => {
    const assignment = await payload.create({
      collection: 'volunteer-assignments',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, editorA)) as any,
      data: {
        shift: shiftA.id,
        contact: organizationContactA.id,
        status: 'invited',
        source: 'manual',
        organization: organizationA.id,
      } as any,
    })

    expect(relationshipID(assignment.contact)).toBe(organizationContactA.id)
    expect(relationshipID(assignment.createdBy)).toBe(editorA.id)
  })

  test('keeps one current assignment record per Shift and Contact', async () => {
    const cancelled = await payload.update({
      collection: 'volunteer-assignments',
      id: assignmentA.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        status: 'cancelled',
      },
    })

    expect(cancelled.status).toBe('cancelled')

    await expect(
      payload.create({
        collection: 'volunteer-assignments',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          shift: shiftA.id,
          contact: contactA.id,
          status: 'invited',
          source: 'manual',
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/contact/i)
  })

  test('rejects a Volunteer Shift from another organization', async () => {
    await expect(
      payload.create({
        collection: 'volunteer-assignments',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          shift: shiftB.id,
          contact: contactA.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/shift/i)
  })

  test('rejects a Contact from another organization', async () => {
    await expect(
      payload.create({
        collection: 'volunteer-assignments',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
        data: {
          shift: shiftA.id,
          contact: contactB.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow(/contact/i)
  })

  test('keeps volunteer reads isolated between organizations', async () => {
    const shiftsA = await payload.find({
      collection: 'volunteer-shifts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      limit: 100,
    })
    const shiftsB = await payload.find({
      collection: 'volunteer-shifts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminB)) as any,
      limit: 100,
    })
    const assignmentsA = await payload.find({
      collection: 'volunteer-assignments',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      limit: 100,
    })

    expect(shiftsA.docs.map((doc) => doc.id)).toContain(shiftA.id)
    expect(shiftsA.docs.map((doc) => doc.id)).not.toContain(shiftB.id)
    expect(shiftsB.docs.map((doc) => doc.id)).toContain(shiftB.id)
    expect(shiftsB.docs.map((doc) => doc.id)).not.toContain(shiftA.id)
    expect(
      assignmentsA.docs.every(
        (doc) => String(relationshipID(doc.organization)) === String(organizationA.id),
      ),
    ).toBe(true)
  })

  test('denies ordinary members broad staff-side volunteer access', async () => {
    await expect(
      payload.find({
        collection: 'volunteer-shifts',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        limit: 50,
      }),
    ).rejects.toThrow()

    await expect(
      payload.find({
        collection: 'volunteer-assignments',
        overrideAccess: false,
        user: (await persistedRequestUser(payload, memberA)) as any,
        limit: 50,
      }),
    ).rejects.toThrow()
  })

  test('preserves assignment history by refusing deletion of referenced shifts', async () => {
    await expect(
      payload.delete({
        collection: 'volunteer-shifts',
        id: shiftA.id,
        overrideAccess: false,
        user: (await persistedRequestUser(payload, adminA)) as any,
      }),
    ).rejects.toThrow()

    const disposable = await payload.create({
      collection: 'volunteer-shifts',
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
      data: {
        event: eventA.id,
        name: 'Disposable volunteer shift',
        startsAt: '2027-02-10T15:00:00.000Z',
        endsAt: '2027-02-10T16:00:00.000Z',
        organization: organizationA.id,
      } as any,
    })

    const deleted = await payload.delete({
      collection: 'volunteer-shifts',
      id: disposable.id,
      overrideAccess: false,
      user: (await persistedRequestUser(payload, adminA)) as any,
    })

    expect(deleted.id).toBe(disposable.id)
  })
})
