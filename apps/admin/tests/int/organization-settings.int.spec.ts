import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

describe('organization settings authorization', () => {
  let platformAdmin: any
  let organizationA: any
  let organizationB: any
  let adminA: any
  let editorA: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    platformAdmin = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'settings-platform-admin@assostack.test',
        password: 'test-password-123',
        name: 'Settings Platform Admin',
        platformRoles: ['platform-admin'],
      } as any,
    })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Settings Association Alpha',
        slug: 'settings-association-alpha',
        status: 'active',
        settings: {
          locale: 'en',
          timezone: 'UTC',
          website: {
            enabled: true,
          },
        },
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Settings Association Beta',
        slug: 'settings-association-beta',
        status: 'active',
        settings: {
          locale: 'en',
          timezone: 'UTC',
          website: {
            enabled: true,
          },
        },
      } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'settings-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Settings Admin A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['organization-admin'],
          },
        ],
      } as any,
    })

    editorA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'settings-editor-a@assostack.test',
        password: 'test-password-123',
        name: 'Settings Editor A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['editor'],
          },
        ],
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('allows an organization admin to update settings for their own organization', async () => {
    const updated = await payload.update({
      collection: 'organizations',
      id: organizationA.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        name: 'Settings Association Alpha Updated',
        settings: {
          locale: 'fr-FR',
          timezone: 'Europe/Paris',
          publicContact: {
            email: 'contact@example.test',
            phone: '+33 1 23 45 67 89',
          },
          website: {
            enabled: true,
            primaryDomain: 'alpha.example.test',
          },
        },
      } as any,
    })

    expect(updated.name).toBe('Settings Association Alpha Updated')
    expect((updated as any).settings?.locale).toBe('fr-FR')
    expect((updated as any).settings?.timezone).toBe('Europe/Paris')
    expect((updated as any).settings?.website?.primaryDomain).toBe('alpha.example.test')
  })

  test('denies organization admins from updating another tenant', async () => {
    await expect(
      payload.update({
        collection: 'organizations',
        id: organizationB.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          name: 'Forbidden cross-tenant update',
        },
      }),
    ).rejects.toThrow()
  })

  test('keeps platform-managed slug and status protected from organization admins', async () => {
    await payload.update({
      collection: 'organizations',
      id: organizationA.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        slug: 'attempted-admin-slug-change',
        status: 'archived',
        settings: {
          locale: 'fr-FR',
          timezone: 'Europe/Paris',
        },
      } as any,
    })

    const stored = await payload.findByID({
      collection: 'organizations',
      id: organizationA.id,
      overrideAccess: true,
    })

    expect(stored.slug).toBe('settings-association-alpha')
    expect(stored.status).toBe('active')
  })

  test('does not let editors change organization settings', async () => {
    await expect(
      payload.update({
        collection: 'organizations',
        id: organizationA.id,
        overrideAccess: false,
        user: asRequestUser(editorA) as any,
        data: {
          settings: {
            locale: 'de-DE',
            timezone: 'Europe/Berlin',
          },
        } as any,
      }),
    ).rejects.toThrow()
  })

  test('allows platform admins to change protected tenant metadata', async () => {
    const updated = await payload.update({
      collection: 'organizations',
      id: organizationB.id,
      overrideAccess: false,
      user: asRequestUser(platformAdmin) as any,
      data: {
        slug: 'settings-association-beta-renamed',
        status: 'suspended',
      },
    })

    expect(updated.slug).toBe('settings-association-beta-renamed')
    expect(updated.status).toBe('suspended')
  })
})
