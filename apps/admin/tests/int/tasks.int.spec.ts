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

describe('CRM tasks', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let memberA: any
  let platformAdmin: any
  let contactA: any
  let contactB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Task Alpha',
        slug: 'task-alpha',
        status: 'active',
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Task Beta',
        slug: 'task-beta',
        status: 'active',
      } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'task-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Task Admin A',
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
        email: 'task-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Task Admin B',
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
        email: 'task-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Task Member A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['member'],
          },
        ],
      } as any,
    })

    platformAdmin = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'task-platform-admin@assostack.test',
        password: 'test-password-123',
        name: 'Task Platform Admin',
        platformRoles: ['platform-admin'],
        organizations: [],
      } as any,
    })

    contactA = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        displayName: 'Task Alpha Contact',
        organization: organizationA.id,
      } as any,
    })

    contactB = await payload.create({
      collection: 'contacts',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      data: {
        displayName: 'Task Beta Contact',
        organization: organizationB.id,
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('creates an open follow-up linked to a same-tenant contact and staff assignee', async () => {
    const task = await payload.create({
      collection: 'tasks',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        title: 'Call the Alpha contact back',
        dueAt: '2026-09-08T09:00:00.000Z',
        contacts: [contactA.id],
        assignee: adminA.id,
        organization: organizationA.id,
      } as any,
    })

    expect(task.status).toBe('open')
    expect(task.priority).toBe('normal')
    expect(task.completedAt).toBeNull()
    expect(relationshipID(task.createdBy)).toBe(adminA.id)
    expect(relationshipID(task.assignee)).toBe(adminA.id)
    expect((task.contacts ?? []).map(relationshipID)).toContain(contactA.id)
  })

  test('maintains completion metadata when a task is completed and reopened', async () => {
    const task = await payload.create({
      collection: 'tasks',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        title: 'Prepare follow-up email',
        contacts: [contactA.id],
        organization: organizationA.id,
      } as any,
    })

    const completed = await payload.update({
      collection: 'tasks',
      id: task.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        status: 'completed',
      },
    })

    expect(completed.status).toBe('completed')
    expect(completed.completedAt).toEqual(expect.any(String))
    expect(relationshipID(completed.completedBy)).toBe(adminA.id)
    expect(relationshipID(completed.createdBy)).toBe(adminA.id)

    const reopened = await payload.update({
      collection: 'tasks',
      id: task.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        status: 'in-progress',
      },
    })

    expect(reopened.status).toBe('in-progress')
    expect(reopened.completedAt).toBeNull()
    expect(reopened.completedBy).toBeNull()
    expect(relationshipID(reopened.createdBy)).toBe(adminA.id)
  })

  test('rejects a Contact from another tenant', async () => {
    await expect(
      payload.create({
        collection: 'tasks',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          title: 'Forbidden cross-tenant task',
          contacts: [contactB.id],
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('rejects a staff assignee from another organization', async () => {
    await expect(
      payload.create({
        collection: 'tasks',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          title: 'Wrong tenant assignee',
          assignee: adminB.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('does not treat an ordinary member as a CRM staff assignee', async () => {
    await expect(
      payload.create({
        collection: 'tasks',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          title: 'Member assignment attempt',
          assignee: memberA.id,
          organization: organizationA.id,
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('allows a platform administrator to be assigned across organizations', async () => {
    const task = await payload.create({
      collection: 'tasks',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        title: 'Platform escalation',
        assignee: platformAdmin.id,
        organization: organizationA.id,
      } as any,
    })

    expect(relationshipID(task.assignee)).toBe(platformAdmin.id)
  })

  test('keeps tasks isolated between organizations', async () => {
    const alphaTask = await payload.create({
      collection: 'tasks',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        title: 'Alpha-only task',
        organization: organizationA.id,
      } as any,
    })

    const resultA = await payload.find({
      collection: 'tasks',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      limit: 50,
    })
    const resultB = await payload.find({
      collection: 'tasks',
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      limit: 50,
    })

    expect(resultA.docs.map((doc) => doc.id)).toContain(alphaTask.id)
    expect(resultB.docs.map((doc) => doc.id)).not.toContain(alphaTask.id)
  })

  test('does not expose staff task data to ordinary members', async () => {
    await expect(
      payload.find({
        collection: 'tasks',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
        limit: 20,
      }),
    ).rejects.toThrow()
  })
})
