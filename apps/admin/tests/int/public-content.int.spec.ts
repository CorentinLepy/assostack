import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import {
  publicPageEndpoint,
  publicPagesEndpoint,
  publicPostEndpoint,
  publicPostsEndpoint,
  publicSiteEndpoint,
} from '../../src/public-api/endpoints'

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
            text: 'Published content',
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

const endpointRequest = (routeParams: Record<string, string>, url: string) =>
  ({
    headers: new Headers(),
    payload,
    routeParams,
    url,
  }) as any

const json = async (response: Response) => (await response.json()) as any

describe('public content API', () => {
  let organizationA: any
  let organizationB: any
  let editorA: any
  let editorB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Public Association Alpha',
        slug: 'public-alpha',
        status: 'active',
        settings: {
          locale: 'fr-FR',
          timezone: 'Europe/Paris',
          publicContact: {
            email: 'contact@alpha.test',
          },
          website: {
            enabled: true,
            primaryDomain: 'alpha.test',
          },
        },
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Public Association Beta',
        slug: 'public-beta',
        status: 'active',
        settings: {
          locale: 'en-GB',
          timezone: 'Europe/London',
          website: {
            enabled: true,
            primaryDomain: 'beta.test',
          },
        },
      } as any,
    })

    editorA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'public-editor-alpha@assostack.test',
        password: 'test-password-123',
        name: 'Public Editor Alpha',
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
        email: 'public-editor-beta@assostack.test',
        password: 'test-password-123',
        name: 'Public Editor Beta',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationB.id,
            roles: ['editor'],
          },
        ],
      } as any,
    })

    await payload.create({
      collection: 'pages',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        title: 'Alpha Home',
        slug: 'home',
        summary: 'Alpha public summary',
        content: richTextFixture,
        organization: organizationA.id,
        _status: 'published',
      } as any,
    })

    await payload.create({
      collection: 'pages',
      draft: true,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        title: 'Alpha Secret Draft',
        slug: 'secret-draft',
        content: richTextFixture,
        organization: organizationA.id,
        _status: 'draft',
      } as any,
    })

    await payload.create({
      collection: 'pages',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editorB) as any,
      data: {
        title: 'Beta Home',
        slug: 'home',
        content: richTextFixture,
        organization: organizationB.id,
        _status: 'published',
      } as any,
    })

    await payload.create({
      collection: 'posts',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        title: 'Alpha News',
        slug: 'alpha-news',
        excerpt: 'A published Alpha post',
        content: richTextFixture,
        organization: organizationA.id,
        _status: 'published',
      } as any,
    })

    await payload.create({
      collection: 'posts',
      draft: true,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        title: 'Alpha Draft News',
        slug: 'draft-news',
        content: richTextFixture,
        organization: organizationA.id,
        _status: 'draft',
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('returns a minimal public organization contract', async () => {
    const response = await publicSiteEndpoint.handler(
      endpointRequest(
        { organization: 'public-alpha' },
        'http://localhost:3001/api/public/v1/public-alpha/site',
      ),
    )
    const body = await json(response)

    expect(response.status).toBe(200)
    expect(body.apiVersion).toBe('v1')
    expect(body.data).toEqual({
      name: 'Public Association Alpha',
      slug: 'public-alpha',
      locale: 'fr-FR',
      timezone: 'Europe/Paris',
      identity: {
        logo: null,
        siteTitle: 'Public Association Alpha',
        tagline: null,
      },
      navigation: [],
      publicContact: {
        email: 'contact@alpha.test',
        phone: null,
      },
      theme: {
        colors: {
          accent: '#2563EB',
          background: '#FBFBF9',
          muted: '#6B7280',
          primary: '#161616',
          surface: '#F7F7F5',
          text: '#161616',
        },
        fontFamily: 'system',
        radius: 'medium',
      },
      website: {
        navigationMode: 'automatic',
        primaryDomain: 'alpha.test',
      },
    })
    expect(body.data.id).toBeUndefined()
    expect(body.data.status).toBeUndefined()
  })

  test('returns only published pages for the requested organization', async () => {
    const response = await publicPagesEndpoint.handler(
      endpointRequest(
        { organization: 'public-alpha' },
        'http://localhost:3001/api/public/v1/public-alpha/pages',
      ),
    )
    const body = await json(response)

    expect(response.status).toBe(200)
    expect(body.data.map((page: any) => page.slug)).toEqual(['home'])
    expect(body.data[0].title).toBe('Alpha Home')
    expect(body.data[0].organization).toBeUndefined()
    expect(body.data[0]._status).toBeUndefined()
  })

  test('isolates same-slug pages by organization', async () => {
    const alphaResponse = await publicPageEndpoint.handler(
      endpointRequest(
        { organization: 'public-alpha', slug: 'home' },
        'http://localhost:3001/api/public/v1/public-alpha/pages/home',
      ),
    )
    const betaResponse = await publicPageEndpoint.handler(
      endpointRequest(
        { organization: 'public-beta', slug: 'home' },
        'http://localhost:3001/api/public/v1/public-beta/pages/home',
      ),
    )

    expect((await json(alphaResponse)).data.title).toBe('Alpha Home')
    expect((await json(betaResponse)).data.title).toBe('Beta Home')
  })

  test('does not expose draft pages', async () => {
    const response = await publicPageEndpoint.handler(
      endpointRequest(
        { organization: 'public-alpha', slug: 'secret-draft' },
        'http://localhost:3001/api/public/v1/public-alpha/pages/secret-draft',
      ),
    )
    const body = await json(response)

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })

  test('returns only published posts and hides draft posts', async () => {
    const listResponse = await publicPostsEndpoint.handler(
      endpointRequest(
        { organization: 'public-alpha' },
        'http://localhost:3001/api/public/v1/public-alpha/posts',
      ),
    )
    const listBody = await json(listResponse)

    expect(listBody.data.map((post: any) => post.slug)).toEqual(['alpha-news'])

    const draftResponse = await publicPostEndpoint.handler(
      endpointRequest(
        { organization: 'public-alpha', slug: 'draft-news' },
        'http://localhost:3001/api/public/v1/public-alpha/posts/draft-news',
      ),
    )

    expect(draftResponse.status).toBe(404)
  })

  test('does not publish inactive or website-disabled organizations', async () => {
    await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Disabled Website',
        slug: 'disabled-website',
        status: 'active',
        settings: {
          locale: 'en',
          timezone: 'UTC',
          website: {
            enabled: false,
          },
        },
      } as any,
    })

    const response = await publicSiteEndpoint.handler(
      endpointRequest(
        { organization: 'disabled-website' },
        'http://localhost:3001/api/public/v1/disabled-website/site',
      ),
    )

    expect(response.status).toBe(404)
  })
})
