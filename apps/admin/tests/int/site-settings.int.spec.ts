import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { publicSiteEndpoint } from '../../src/public-api/endpoints'

let payload: Payload

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

const richTextFixture = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Site settings test content.',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
}

const endpointRequest = (organization: string) =>
  ({
    headers: new Headers(),
    payload,
    routeParams: { organization },
    url: `http://localhost:3001/api/public/v1/${organization}/site`,
  }) as any

describe('organization public-site settings', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let adminB: any
  let pageA: any
  let pageB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Theme Association Alpha',
        slug: 'theme-association-alpha',
        status: 'active',
        settings: {
          locale: 'fr-FR',
          timezone: 'Europe/Paris',
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
        name: 'Theme Association Beta',
        slug: 'theme-association-beta',
        status: 'active',
        settings: {
          locale: 'fr-FR',
          timezone: 'Europe/Paris',
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
        email: 'theme-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Theme Admin A',
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
        email: 'theme-admin-b@assostack.test',
        password: 'test-password-123',
        name: 'Theme Admin B',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationB.id,
            roles: ['organization-admin'],
          },
        ],
      } as any,
    })

    pageA = await payload.create({
      collection: 'pages',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        title: 'Alpha About',
        slug: 'about',
        content: richTextFixture,
        organization: organizationA.id,
        _status: 'published',
      } as any,
    })

    pageB = await payload.create({
      collection: 'pages',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(adminB) as any,
      data: {
        title: 'Beta About',
        slug: 'about',
        content: richTextFixture,
        organization: organizationB.id,
        _status: 'published',
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('lets an organization admin configure manual navigation and theme tokens', async () => {
    const updated = await payload.update({
      collection: 'organizations',
      id: organizationA.id,
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        settings: {
          locale: 'fr-FR',
          timezone: 'Europe/Paris',
          publicContact: {
            email: 'bonjour@alpha.test',
          },
          website: {
            enabled: true,
            primaryDomain: 'alpha.test',
            siteTitle: 'Alpha Club',
            tagline: 'Together around our shared passion.',
            navigationMode: 'manual',
            navigation: [
              {
                label: 'About',
                kind: 'page',
                page: pageA.id,
              },
              {
                label: 'Partner',
                kind: 'external',
                url: 'https://example.com/partner',
                newTab: true,
              },
            ],
            theme: {
              primaryColor: '#112233',
              accentColor: '#445566',
              backgroundColor: '#FAFAF8',
              surfaceColor: '#F0F0EC',
              textColor: '#101010',
              mutedColor: '#667788',
              fontFamily: 'humanist',
              radius: 'large',
            },
          },
        },
      } as any,
    })

    expect((updated as any).settings?.website?.siteTitle).toBe('Alpha Club')
    expect((updated as any).settings?.website?.navigation).toHaveLength(2)
    expect((updated as any).settings?.website?.theme?.radius).toBe('large')
  })

  test('rejects a manual navigation page owned by another organization', async () => {
    try {
      await payload.update({
        collection: 'organizations',
        id: organizationA.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          settings: {
            locale: 'fr-FR',
            timezone: 'Europe/Paris',
            website: {
              enabled: true,
              navigationMode: 'manual',
              navigation: [
                {
                  label: 'Foreign page',
                  kind: 'page',
                  page: pageB.id,
                },
              ],
            },
          },
        } as any,
      })

      throw new Error('Expected foreign navigation page to be rejected')
    } catch (error: any) {
      expect(error?.data?.errors?.[0]?.path).toBe('settings.website.navigation.0.page')
      expect(error?.data?.errors?.[0]?.message).toMatch(/same organization/i)
    }
  })

  test('rejects unsafe external navigation schemes', async () => {
    try {
      await payload.update({
        collection: 'organizations',
        id: organizationA.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          settings: {
            locale: 'fr-FR',
            timezone: 'Europe/Paris',
            website: {
              enabled: true,
              navigationMode: 'manual',
              navigation: [
                {
                  label: 'Unsafe',
                  kind: 'external',
                  url: 'javascript:alert(1)',
                },
              ],
            },
          },
        } as any,
      })

      throw new Error('Expected unsafe navigation URL to be rejected')
    } catch (error: any) {
      expect(error?.data?.errors?.[0]?.path).toBe('settings.website.navigation.0.url')
      expect(error?.data?.errors?.[0]?.message).toMatch(/http/i)
    }
  })

  test('publishes ordered ID-free navigation and constrained theme tokens', async () => {
    const response = await publicSiteEndpoint.handler(endpointRequest('theme-association-alpha'))
    const body = (await response.json()) as any

    expect(response.status).toBe(200)
    expect(body.data.identity).toEqual({
      logo: null,
      siteTitle: 'Alpha Club',
      tagline: 'Together around our shared passion.',
    })
    expect(body.data.navigation).toEqual([
      {
        external: false,
        href: '/about',
        label: 'About',
        newTab: false,
      },
      {
        external: true,
        href: 'https://example.com/partner',
        label: 'Partner',
        newTab: true,
      },
    ])
    expect(body.data.theme).toEqual({
      colors: {
        accent: '#445566',
        background: '#FAFAF8',
        muted: '#667788',
        primary: '#112233',
        surface: '#F0F0EC',
        text: '#101010',
      },
      fontFamily: 'humanist',
      radius: 'large',
    })
    expect(JSON.stringify(body.data.navigation)).not.toContain(String(pageA.id))
  })

  test('returns stable default theme and automatic navigation mode without customization', async () => {
    const response = await publicSiteEndpoint.handler(endpointRequest('theme-association-beta'))
    const body = (await response.json()) as any

    expect(body.data.identity.siteTitle).toBe('Theme Association Beta')
    expect(body.data.website.navigationMode).toBe('automatic')
    expect(body.data.navigation).toEqual([])
    expect(body.data.theme.colors.background).toBe('#FBFBF9')
    expect(body.data.theme.fontFamily).toBe('system')
    expect(body.data.theme.radius).toBe('medium')
  })
})
