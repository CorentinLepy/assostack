import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

const emptyRichText = {
  root: {
    type: 'root',
    children: [],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
}

const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

describe('tenant-aware CMS', () => {
  let platformAdmin: any
  let organizationA: any
  let organizationB: any
  let editorA: any
  let editorB: any
  let memberA: any
  let pageA: any
  let pageB: any
  let mediaA: any
  let mediaB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    platformAdmin = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'cms-platform-admin@assostack.test',
        password: 'test-password-123',
        name: 'CMS Platform Admin',
        platformRoles: ['platform-admin'],
      } as any,
    })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'CMS Association Alpha',
        slug: 'cms-association-alpha',
        status: 'active',
      } as any,
    })

    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'CMS Association Beta',
        slug: 'cms-association-beta',
        status: 'active',
      } as any,
    })

    editorA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'cms-editor-a@assostack.test',
        password: 'test-password-123',
        name: 'CMS Editor A',
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
        email: 'cms-editor-b@assostack.test',
        password: 'test-password-123',
        name: 'CMS Editor B',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationB.id,
            roles: ['editor'],
          },
        ],
      } as any,
    })

    memberA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'cms-member-a@assostack.test',
        password: 'test-password-123',
        name: 'CMS Member A',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organizationA.id,
            roles: ['member'],
          },
        ],
      } as any,
    })

    mediaA = await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: asRequestUser(platformAdmin) as any,
      data: {
        alt: 'Alpha pixel',
        organization: organizationA.id,
      } as any,
      file: {
        data: transparentPixel,
        mimetype: 'image/png',
        name: 'alpha-pixel.png',
        size: transparentPixel.length,
      },
    })

    mediaB = await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: asRequestUser(platformAdmin) as any,
      data: {
        alt: 'Beta pixel',
        organization: organizationB.id,
      } as any,
      file: {
        data: transparentPixel,
        mimetype: 'image/png',
        name: 'beta-pixel.png',
        size: transparentPixel.length,
      },
    })

    pageA = await payload.create({
      collection: 'pages',
      draft: true,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        title: 'About Alpha',
        slug: 'About',
        content: emptyRichText,
        organization: organizationA.id,
        _status: 'draft',
      } as any,
    })

    pageB = await payload.create({
      collection: 'pages',
      draft: true,
      overrideAccess: false,
      user: asRequestUser(editorB) as any,
      data: {
        title: 'About Beta',
        slug: 'about',
        content: emptyRichText,
        organization: organizationB.id,
        _status: 'draft',
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('normalizes slugs and allows the same page slug in different organizations', () => {
    expect(pageA.slug).toBe('about')
    expect(pageB.slug).toBe('about')
    expect(pageA.organization).not.toEqual(pageB.organization)
  })

  test('rejects duplicate page slugs inside the same organization', async () => {
    await expect(
      payload.create({
        collection: 'pages',
        draft: true,
        overrideAccess: false,
        user: asRequestUser(editorA) as any,
        data: {
          title: 'Another Alpha About',
          slug: 'about',
          content: emptyRichText,
          organization: organizationA.id,
          _status: 'draft',
        } as any,
      }),
    ).rejects.toThrow(/slug/i)
  })

  test('scopes editorial page reads to the current organization', async () => {
    const result = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      limit: 20,
    })

    expect(result.docs.map((doc) => doc.id)).toContain(pageA.id)
    expect(result.docs.map((doc) => doc.id)).not.toContain(pageB.id)
  })

  test('denies cross-tenant page updates', async () => {
    await expect(
      payload.update({
        collection: 'pages',
        id: pageB.id,
        overrideAccess: false,
        user: asRequestUser(editorA) as any,
        data: {
          title: 'Forbidden cross-tenant edit',
        },
      }),
    ).rejects.toThrow()
  })

  test('does not expose draft CMS content to members or unauthenticated callers', async () => {
    await expect(
      payload.find({
        collection: 'pages',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
      }),
    ).rejects.toThrow()

    await expect(
      payload.find({
        collection: 'pages',
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  test('publishes a versioned page and populates its publication timestamp', async () => {
    const published = await payload.update({
      collection: 'pages',
      id: pageA.id,
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        _status: 'published',
      } as any,
    })

    expect(published._status).toBe('published')
    expect(published.publishedAt).toBeTruthy()

    const versions = await payload.findVersions({
      collection: 'pages',
      overrideAccess: true,
      where: {
        parent: {
          equals: pageA.id,
        },
      },
    })

    expect(versions.totalDocs).toBeGreaterThan(0)
  })

  test('scopes media metadata to the current organization', async () => {
    const result = await payload.find({
      collection: 'media',
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      limit: 20,
    })

    expect(result.docs.map((doc) => doc.id)).toContain(mediaA.id)
    expect(result.docs.map((doc) => doc.id)).not.toContain(mediaB.id)
  })

  test('rejects a cross-tenant media relationship', async () => {
    await expect(
      payload.create({
        collection: 'posts',
        draft: true,
        overrideAccess: false,
        user: asRequestUser(editorA) as any,
        data: {
          title: 'Alpha post with foreign media',
          slug: 'foreign-media',
          heroImage: mediaB.id,
          content: emptyRichText,
          organization: organizationA.id,
          _status: 'draft',
        } as any,
      }),
    ).rejects.toThrow(/same organization/i)
  })

  test('rejects duplicate post slugs inside the same organization', async () => {
    await payload.create({
      collection: 'posts',
      draft: true,
      overrideAccess: false,
      user: asRequestUser(editorA) as any,
      data: {
        title: 'First News',
        slug: 'news',
        heroImage: mediaA.id,
        content: emptyRichText,
        organization: organizationA.id,
        _status: 'draft',
      } as any,
    })

    await expect(
      payload.create({
        collection: 'posts',
        draft: true,
        overrideAccess: false,
        user: asRequestUser(editorA) as any,
        data: {
          title: 'Second News',
          slug: 'news',
          content: emptyRichText,
          organization: organizationA.id,
          _status: 'draft',
        } as any,
      }),
    ).rejects.toThrow(/slug/i)
  })
})
