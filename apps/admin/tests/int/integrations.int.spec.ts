import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { createDefaultIntegrationRegistry } from '../../src/integrations/registry'
import { createProviderFailureState } from '../../src/integrations/health'
import { processInboundWebhook, type WebhookEventStore } from '../../src/integrations/webhooks'

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

describe('integration foundation', () => {
  let payload: Payload
  let organizationA: any
  let organizationB: any
  let adminA: any
  let memberA: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Integration Alpha', slug: 'integration-alpha', status: 'active' } as any,
    })
    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Integration Beta', slug: 'integration-beta', status: 'active' } as any,
    })
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'integration-platform-admin@assostack.test',
        password: 'test-password-123',
        name: 'Integration Platform Admin',
        platformRoles: ['platform-admin'],
      } as any,
    })
    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'integration-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Integration Admin A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }],
      } as any,
    })
    memberA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'integration-member-a@assostack.test',
        password: 'test-password-123',
        name: 'Integration Member A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['member'] }],
      } as any,
    })
  })

  afterAll(async () => {
    if (payload) {
      await payload.destroy()
    }
  })

  test('registers every initial provider without implementing external APIs', () => {
    const registry = createDefaultIntegrationRegistry()

    expect(registry.list()).toEqual([
      'helloasso',
      'brevo',
      'smtp',
      'cloudflare-r2',
      'cloudflare-turnstile',
      'webhook',
      'automation',
    ])
    expect(registry.get('unknown')).toBeUndefined()
    expect(registry.get('brevo')?.execute).toBeDefined()
  })

  test('accepts a verified webhook once and treats the duplicate as idempotent', async () => {
    const keys = new Set<string>()
    const store: WebhookEventStore = {
      has: async (key) => keys.has(key),
      record: async (key) => void keys.add(key),
    }
    const adapter = {
      provider: 'webhook' as const,
      capabilities: ['inbound-webhooks' as const],
      validateConfig: (value: unknown): value is Record<string, unknown> => Boolean(value),
      verifyInboundWebhook: async () => ({ eventID: 'evt-1', payload: { kind: 'example' } }),
    }

    const input = {
      adapter,
      body: '{}',
      headers: new Headers(),
      integrationID: 'integration-1',
      organizationID: organizationA.id,
      secret: undefined,
      store,
    }

    await expect(processInboundWebhook(input)).resolves.toMatchObject({ status: 'accepted', eventID: 'evt-1' })
    await expect(processInboundWebhook(input)).resolves.toEqual({ status: 'duplicate', eventID: 'evt-1' })
  })

  test('rejects an invalid inbound webhook', async () => {
    const adapter = {
      provider: 'webhook' as const,
      capabilities: ['inbound-webhooks' as const],
      validateConfig: (value: unknown): value is Record<string, unknown> => Boolean(value),
      verifyInboundWebhook: async () => {
        throw new Error('signature mismatch')
      },
    }

    await expect(
      processInboundWebhook({
        adapter,
        body: '{}',
        headers: new Headers(),
        integrationID: 'integration-1',
        organizationID: organizationA.id,
        secret: undefined,
        store: { has: async () => false, record: async () => undefined },
      }),
    ).resolves.toMatchObject({ status: 'rejected', error: { code: 'webhook-invalid' } })
  })

  test('records provider failures without leaking credential-shaped values', () => {
    const state = createProviderFailureState(
      new Error('Brevo token=real-test-token provider request failed.'),
      () => new Date('2026-01-02T03:04:05.000Z'),
    )

    expect(state).toEqual({
      lastFailureAt: '2026-01-02T03:04:05.000Z',
      lastError: 'Brevo token=[redacted] provider request failed.',
    })
    expect(JSON.stringify(state)).not.toContain('real-test-token')
  })

  test('isolates integration records and never serializes secret references', async () => {
    const integrationA = await payload.create({
      collection: 'integrations',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      data: {
        name: 'Alpha webhook',
        provider: 'webhook',
        status: 'enabled',
        organization: organizationA.id,
        config: { endpoint: '/events' },
        secretRef: { key: 'INTEGRATION_ALPHA_SECRET' },
      } as any,
    })

    expect(JSON.stringify(integrationA)).not.toContain('INTEGRATION_ALPHA_SECRET')

    const visible = await payload.find({
      collection: 'integrations',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
    })
    expect(visible.docs.map((doc) => doc.id)).toContain(integrationA.id)
    expect(JSON.stringify(visible)).not.toContain('INTEGRATION_ALPHA_SECRET')

    await expect(
      payload.find({
        collection: 'integrations',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'integrations',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          name: 'Invalid webhook',
          provider: 'webhook',
          status: 'enabled',
          organization: organizationA.id,
          config: [],
        } as any,
      }),
    ).rejects.toThrow()

    const integrationB = await payload.create({
      collection: 'integrations',
      overrideAccess: true,
      user: asRequestUser({ platformRoles: ['platform-admin'] }) as any,
      data: {
        name: 'Beta webhook',
        provider: 'webhook',
        status: 'enabled',
        organization: organizationB.id,
        config: {},
      } as any,
    })

    await expect(
      payload.update({
        collection: 'integrations',
        id: integrationB.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          name: 'Attempted beta edit',
        } as any,
      }),
    ).rejects.toThrow()
  })
})