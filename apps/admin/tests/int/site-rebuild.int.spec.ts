import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

import { getPublicContentSiteSyncReason } from '../../src/site-rebuild/hooks'
import { deliverSiteSyncRequest } from '../../src/site-rebuild/webhook'

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
            text: 'Site rebuild content',
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

const bodyOf = (call: any[]) => JSON.parse(String(call[1]?.body)) as any

describe('generic static-site rebuild requests', () => {
  let organization: any
  let editor: any
  let organizationAdmin: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organization = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: 'Site Rebuild Association',
        slug: 'site-rebuild-association',
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

    editor = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'site-rebuild-editor@assostack.test',
        password: 'test-password-123',
        name: 'Site Rebuild Editor',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organization.id,
            roles: ['editor'],
          },
        ],
      } as any,
    })

    organizationAdmin = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'site-rebuild-admin@assostack.test',
        password: 'test-password-123',
        name: 'Site Rebuild Admin',
        platformRoles: ['user'],
        organizations: [
          {
            organization: organization.id,
            roles: ['organization-admin'],
          },
        ],
      } as any,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('classifies public-state transitions and ignores draft-only edits', () => {
    expect(
      getPublicContentSiteSyncReason({
        current: { _status: 'draft' },
        kind: 'page',
        previous: { _status: 'draft' },
      }),
    ).toBeNull()

    expect(
      getPublicContentSiteSyncReason({
        current: { _status: 'published' },
        kind: 'page',
        previous: { _status: 'draft' },
      }),
    ).toBe('page.published')

    expect(
      getPublicContentSiteSyncReason({
        current: { _status: 'published' },
        kind: 'post',
        previous: { _status: 'published' },
      }),
    ).toBe('post.updated')

    expect(
      getPublicContentSiteSyncReason({
        current: { _status: 'draft' },
        kind: 'page',
        previous: { _status: 'published' },
      }),
    ).toBe('page.unpublished')
  })

  test('is a no-op when no site rebuild webhook is configured', async () => {
    vi.stubEnv('ASSOSTACK_SITE_REBUILD_WEBHOOK_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await deliverSiteSyncRequest({
      action: 'rebuild',
      now: () => new Date('2026-09-07T06:00:00.000Z'),
      organizationSlug: 'site-rebuild-association',
      reason: 'page.updated',
      req: {
        payload: {
          logger: {
            warn: vi.fn(),
          },
        },
      } as any,
    })

    expect(result).toEqual({ status: 'disabled' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('sends the stable v1 payload with an optional bearer token', async () => {
    vi.stubEnv('ASSOSTACK_SITE_REBUILD_WEBHOOK_URL', 'https://deploy.example.test/site-sync')
    vi.stubEnv('ASSOSTACK_SITE_REBUILD_WEBHOOK_TOKEN', 'test-only-secret-token')

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await deliverSiteSyncRequest({
      action: 'rebuild',
      now: () => new Date('2026-09-07T06:00:00.000Z'),
      organizationSlug: 'site-rebuild-association',
      reason: 'post.published',
      req: {
        payload: {
          logger: {
            warn: vi.fn(),
          },
        },
      } as any,
    })

    expect(result).toEqual({ status: 'delivered' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as any[]
    expect(String(url)).toBe('https://deploy.example.test/site-sync')
    expect(init.method).toBe('POST')
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer test-only-secret-token')
    expect(bodyOf(fetchMock.mock.calls[0] as any[])).toEqual({
      action: 'rebuild',
      event: 'site.sync.requested',
      occurredAt: '2026-09-07T06:00:00.000Z',
      organization: {
        slug: 'site-rebuild-association',
      },
      reason: 'post.published',
      version: 1,
    })
  })

  test('logs delivery failures without leaking the bearer token', async () => {
    vi.stubEnv('ASSOSTACK_SITE_REBUILD_WEBHOOK_URL', 'https://deploy.example.test/site-sync')
    vi.stubEnv('ASSOSTACK_SITE_REBUILD_WEBHOOK_TOKEN', 'must-not-appear-in-logs')

    const fetchMock = vi.fn().mockRejectedValue(new Error('network unavailable'))
    const warn = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await deliverSiteSyncRequest({
      action: 'rebuild',
      organizationSlug: 'site-rebuild-association',
      reason: 'page.updated',
      req: {
        payload: {
          logger: { warn },
        },
      } as any,
    })

    expect(result).toEqual({ status: 'failed' })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(warn.mock.calls)).not.toContain('must-not-appear-in-logs')
  })

  test('triggers rebuilds for published content but not draft-only writes', async () => {
    vi.stubEnv('ASSOSTACK_SITE_REBUILD_WEBHOOK_URL', 'https://deploy.example.test/site-sync')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    const draft = await payload.create({
      collection: 'pages',
      draft: true,
      overrideAccess: false,
      user: asRequestUser(editor) as any,
      data: {
        title: 'Rebuild Draft',
        slug: 'rebuild-draft',
        content: richTextFixture,
        organization: organization.id,
        _status: 'draft',
      } as any,
    })

    expect(fetchMock).not.toHaveBeenCalled()

    await payload.update({
      collection: 'pages',
      id: draft.id,
      draft: true,
      overrideAccess: false,
      user: asRequestUser(editor) as any,
      data: {
        title: 'Rebuild Draft Updated',
        content: richTextFixture,
        _status: 'draft',
      } as any,
    })

    expect(fetchMock).not.toHaveBeenCalled()

    await payload.update({
      collection: 'pages',
      id: draft.id,
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editor) as any,
      data: {
        content: richTextFixture,
        _status: 'published',
      } as any,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(bodyOf(fetchMock.mock.calls[0] as any[])).toMatchObject({
      action: 'rebuild',
      organization: { slug: 'site-rebuild-association' },
      reason: 'page.published',
    })
  })

  test('keeps a successful CMS write when the rebuild provider is unavailable', async () => {
    vi.stubEnv('ASSOSTACK_SITE_REBUILD_WEBHOOK_URL', 'https://deploy.example.test/site-sync')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('provider unavailable')))

    const published = await payload.create({
      collection: 'posts',
      draft: false,
      overrideAccess: false,
      user: asRequestUser(editor) as any,
      data: {
        title: 'Provider failure post',
        slug: 'provider-failure-post',
        content: richTextFixture,
        organization: organization.id,
        _status: 'published',
      } as any,
    })

    expect(published._status).toBe('published')
  })

  test('requests a disable action when an organization website is disabled', async () => {
    vi.stubEnv('ASSOSTACK_SITE_REBUILD_WEBHOOK_URL', 'https://deploy.example.test/site-sync')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await payload.update({
      collection: 'organizations',
      id: organization.id,
      overrideAccess: false,
      user: asRequestUser(organizationAdmin) as any,
      data: {
        settings: {
          locale: 'en',
          timezone: 'UTC',
          website: {
            enabled: false,
          },
        },
      } as any,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(bodyOf(fetchMock.mock.calls[0] as any[])).toMatchObject({
      action: 'disable',
      organization: { slug: 'site-rebuild-association' },
      reason: 'organization.disabled',
    })
  })
})
