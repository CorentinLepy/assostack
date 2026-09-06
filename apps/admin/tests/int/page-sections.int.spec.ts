import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { publicPageEndpoint } from '../../src/public-api/endpoints'

let payload: Payload

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

const richTextFixture = (text: string) => ({
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
            text,
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
})

const containsForbiddenKey = (value: unknown, forbiddenKeys: ReadonlySet<string>): boolean => {
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenKey(item, forbiddenKeys))
  }

  if (!value || typeof value !== 'object') {
    return false
  }

  return Object.entries(value as Record<string, unknown>).some(
    ([key, nestedValue]) =>
      forbiddenKeys.has(key) || containsForbiddenKey(nestedValue, forbiddenKeys),
  )
}

const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

const endpointRequest = (organization: string, slug: string) =>
  ({
    headers: new Headers(),
    payload,
    routeParams: { organization, slug },
    url: `http://localhost:3001/api/public/v1/${organization}/pages/${slug}`,
  }) as any

describe('structured public page sections', () => {
  let organizationA: any
  let organizationB: any
  let editorA: any
  let editorB: any
  let targetA: any
  let targetB: any
  let mediaA: any
  let mediaB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Sections Association Alpha',
        slug: 'sections-association-alpha',
        status: 'active',
        settings: {
          locale: 'fr-FR',
          timezone: 'Europe/Paris',
          website: { enabled: true },
        },
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Sections Association Beta',
        slug: 'sections-association-beta',
        status: 'active',
        settings: {
          locale: 'fr-FR',
          timezone: 'Europe/Paris',
          website: { enabled: true },
        },
      } as any,
    })

    editorA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'sections-editor-a@assostack.test',
        password: 'test-password-123',
        name: 'Sections Editor A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['editor'],
          },
        ],
      } as any,
    })

    editorB = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'sections-editor-b@assostack.test',
        password: 'test-password-123',
        name: 'Sections Editor B',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationB.id,
            roles: ['editor'],
          },
        ],
      } as any,
    })

    mediaA = await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        alt: 'Alpha section image',
        organization: organizationA.id,
      } as any,
      file: {
        data: transparentPixel,
        mimetype: 'image/png',
        name: 'sections-alpha.png',
        size: transparentPixel.length,
      },
    })

    mediaB = await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: asRequestUser(editorB) as any,
      data: {
        alt: 'Beta section image',
        organization: organizationB.id,
      } as any,
      file: {
        data: transparentPixel,
        mimetype: 'image/png',
        name: 'sections-beta.png',
        size: transparentPixel.length,
      },
    })

    targetA = await payload.create({
      collection: 'pages',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        title: 'Join Alpha',
        slug: 'join-alpha',
        content: richTextFixture('Join Alpha.'),
        organization: organizationA.id,
        _status: 'published',
      } as any,
    })

    targetB = await payload.create({
      collection: 'pages',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editorB) as any,
      data: {
        title: 'Join Beta',
        slug: 'join-beta',
        content: richTextFixture('Join Beta.'),
        organization: organizationB.id,
        _status: 'published',
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('publishes a stable ID-free DTO for reusable page sections', async () => {
    await payload.create({
      collection: 'pages',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        title: 'Alpha Sections Home',
        slug: 'sections-home',
        organization: organizationA.id,
        _status: 'published',
        sections: [
          {
            blockType: 'hero',
            eyebrow: 'Alpha',
            heading: 'A structured public page',
            text: 'Built from constrained reusable sections.',
            image: mediaA.id,
            alignment: 'left',
            action: {
              label: 'Join us',
              kind: 'page',
              page: targetA.id,
            },
          },
          {
            blockType: 'richText',
            content: richTextFixture('Structured rich-text content.'),
          },
          {
            blockType: 'cards',
            heading: 'Our activities',
            intro: 'A reusable set of cards.',
            items: [
              {
                title: 'Community',
                text: 'People first.',
                action: {
                  label: 'External resource',
                  kind: 'external',
                  url: 'https://example.com/community',
                  newTab: true,
                },
              },
            ],
          },
          {
            blockType: 'callout',
            heading: 'Read our latest updates',
            text: 'Discover what is happening in the organization.',
            tone: 'accent',
            action: {
              label: 'Latest news',
              kind: 'route',
              route: 'news',
            },
          },
        ],
      } as any,
    })

    const response = await publicPageEndpoint.handler(
      endpointRequest('sections-association-alpha', 'sections-home'),
    )
    const body = (await response.json()) as any

    expect(response.status).toBe(200)
    expect(body.data.sections.map((section: any) => section.type)).toEqual([
      'hero',
      'richText',
      'cards',
      'callout',
    ])
    expect(body.data.sections[0]).toMatchObject({
      type: 'hero',
      heading: 'A structured public page',
      action: {
        external: false,
        href: '/join-alpha',
        label: 'Join us',
        newTab: false,
      },
    })
    expect(body.data.sections[0].image).toEqual({
      alt: 'Alpha section image',
      height: 1,
      url: expect.stringContaining('/api/media/file/sections-alpha.png'),
      width: 1,
    })
    expect(body.data.sections[2].items[0].action).toEqual({
      external: true,
      href: 'https://example.com/community',
      label: 'External resource',
      newTab: true,
    })
    expect(body.data.sections[3]).toMatchObject({
      type: 'callout',
      tone: 'accent',
      action: {
        external: false,
        href: '/news',
        label: 'Latest news',
        newTab: false,
      },
    })

    expect(
      containsForbiddenKey(
        body.data.sections,
        new Set(['id', 'organization', 'blockType']),
      ),
    ).toBe(false)
    expect(body.data.sections[0].action).not.toHaveProperty('page')
    expect(body.data.sections[2].items[0].action).not.toHaveProperty('url')
    expect(body.data.sections[3].action).not.toHaveProperty('route')
  })

  test('rejects a page section linking to a page from another organization', async () => {
    try {
      await payload.create({
        collection: 'pages',
        draft: true,
        overrideAccess: false,
        user: asRequestUser(editorA) as any,
        data: {
          title: 'Foreign section link',
          slug: 'foreign-section-link',
          organization: organizationA.id,
          _status: 'draft',
          sections: [
            {
              blockType: 'hero',
              heading: 'Foreign link',
              action: {
                label: 'Wrong tenant',
                kind: 'page',
                page: targetB.id,
              },
            },
          ],
        } as any,
      })

      throw new Error('Expected cross-tenant page action to be rejected')
    } catch (error: any) {
      expect(error?.data?.errors?.[0]?.message).toMatch(/same organization/i)
      expect(error?.data?.errors?.[0]?.path).toMatch(/page/i)
    }
  })

  test('rejects a page section referencing media from another organization', async () => {
    try {
      await payload.create({
        collection: 'pages',
        draft: true,
        overrideAccess: false,
        user: asRequestUser(editorA) as any,
        data: {
          title: 'Foreign section media',
          slug: 'foreign-section-media',
          organization: organizationA.id,
          _status: 'draft',
          sections: [
            {
              blockType: 'hero',
              heading: 'Foreign image',
              image: mediaB.id,
            },
          ],
        } as any,
      })

      throw new Error('Expected cross-tenant section media to be rejected')
    } catch (error: any) {
      expect(error?.data?.errors?.[0]?.message).toMatch(/same organization/i)
      expect(error?.data?.errors?.[0]?.path).toMatch(/image/i)
    }
  })

  test('keeps rich-text-only pages compatible with an empty sections array', async () => {
    const page = await payload.create({
      collection: 'pages',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        title: 'Legacy simple page',
        slug: 'legacy-simple-page',
        content: richTextFixture('Simple body remains supported.'),
        organization: organizationA.id,
        _status: 'published',
      } as any,
    })

    const response = await publicPageEndpoint.handler(
      endpointRequest('sections-association-alpha', page.slug),
    )
    const body = (await response.json()) as any

    expect(body.data.sections).toEqual([])
    expect(body.data.content).toBeTruthy()
  })
})
