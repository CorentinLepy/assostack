import config from '@/payload.config'
import { createHmac, randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

import { integrationWebhookEndpoint } from '../../src/integrations/webhook-endpoint'
import { createPayloadWebhookEventStore } from '../../src/integrations/webhook-event-store'

const suiteSuffix = randomUUID()
const suiteSecretKey = (number: string) => `TEST_WEBHOOK_SECRET_${suiteSuffix}_${number}`
const eventID = (name: string) => `${name}-${suiteSuffix}`

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

const sign = (secret: string, body: string) => createHmac('sha256', secret).update(body, 'utf8').digest('hex')

const endpointRequest = (
  integrationID: string | number,
  body: string,
  headers: Record<string, string>,
  payload: Payload,
) =>
  ({
    headers: new Headers(headers),
    payload,
    routeParams: { id: String(integrationID) },
    text: async () => body,
    url: `http://localhost:3001/api/integrations/${integrationID}/webhook`,
  }) as any

const json = async (response: Response) => (await response.json()) as any

describe('generic inbound webhook runtime', () => {
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
      data: { name: 'Webhook Alpha', slug: `webhook-alpha-${suiteSuffix}`, status: 'active' } as any,
    })
    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Webhook Beta', slug: `webhook-beta-${suiteSuffix}`, status: 'active' } as any,
    })
    // Consumes the "first user is auto-promoted to platform-admin" slot so adminA below is a normal org admin.
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: `webhook-platform-admin-${suiteSuffix}@assostack.test`,
        password: 'test-password-123',
        name: 'Webhook Platform Admin',
        platformRoles: ['platform-admin'],
      } as any,
    })
    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: `webhook-admin-a-${suiteSuffix}@assostack.test`,
        password: 'test-password-123',
        name: 'Webhook Admin A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }],
      } as any,
    })
    memberA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: `webhook-member-a-${suiteSuffix}@assostack.test`,
        password: 'test-password-123',
        name: 'Webhook Member A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['member'] }],
      } as any,
    })
  })

  afterAll(async () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith(`TEST_WEBHOOK_SECRET_${suiteSuffix}_`)) {
        delete process.env[key]
      }
    }
    if (payload) {
      await payload.destroy()
    }
  })

  const createWebhookIntegration = async (organizationID: string | number, secretEnvKey: string, secretValue: string) => {
    process.env[secretEnvKey] = secretValue
    return payload.create({
      collection: 'integrations',
      overrideAccess: true,
      user: asRequestUser({ platformRoles: ['platform-admin'] }) as any,
      data: {
        name: 'Generic webhook',
        provider: 'webhook',
        status: 'enabled',
        organization: organizationID,
        config: {},
        secretRef: { key: secretEnvKey },
      } as any,
    })
  }

  test('accepts a validly signed webhook, persists it once, and updates health', async () => {
    const integration = await createWebhookIntegration(organizationA.id, suiteSecretKey('1'), 'super-secret-1')
    const body = JSON.stringify({ hello: 'world' })
    const signature = sign('super-secret-1', body)

    const response = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integration.id,
        body,
        { 'x-assostack-signature': signature, 'x-assostack-event-id': eventID('evt-accept-1') },
        payload,
      ),
    )
    expect(response.status).toBe(202)
    expect((await json(response)).status).toBe('accepted')

    const events = await payload.find({
      collection: 'webhook-events',
      overrideAccess: true,
      where: { eventId: { equals: eventID('evt-accept-1') } },
    })
    expect(events.docs).toHaveLength(1)

    const updated = await payload.findByID({ collection: 'integrations', id: integration.id, overrideAccess: true })
    expect((updated as any).lastSuccessAt).toBeTruthy()

    // Duplicate delivery is idempotent.
    const duplicateResponse = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integration.id,
        body,
        { 'x-assostack-signature': signature, 'x-assostack-event-id': eventID('evt-accept-1') },
        payload,
      ),
    )
    expect(duplicateResponse.status).toBe(200)
    expect((await json(duplicateResponse)).status).toBe('duplicate')

    const eventsAfterDuplicate = await payload.find({
      collection: 'webhook-events',
      overrideAccess: true,
      where: { eventId: { equals: eventID('evt-accept-1') } },
    })
    expect(eventsAfterDuplicate.docs).toHaveLength(1)
  })

  test('rejects an invalid signature and records sanitized failure health without leaking the secret', async () => {
    const integration = await createWebhookIntegration(organizationA.id, suiteSecretKey('2'), 'super-secret-2')
    const body = JSON.stringify({ hello: 'world' })

    const response = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integration.id,
        body,
        { 'x-assostack-signature': 'a'.repeat(64), 'x-assostack-event-id': eventID('evt-invalid-sig') },
        payload,
      ),
    )
    expect(response.status).toBe(400)
    const responseBody = JSON.stringify(await json(response))
    expect(responseBody).not.toContain('super-secret-2')

    const updated = await payload.findByID({ collection: 'integrations', id: integration.id, overrideAccess: true })
    expect((updated as any).lastFailureAt).toBeTruthy()
    expect((updated as any).lastError).toBeTruthy()
    expect((updated as any).lastError).not.toContain('super-secret-2')
    expect((updated as any).lastError).not.toContain('a'.repeat(64))
  })

  test('rejects a request missing its signature header', async () => {
    const integration = await createWebhookIntegration(organizationA.id, suiteSecretKey('3'), 'super-secret-3')
    const body = JSON.stringify({ hello: 'world' })

    const response = await integrationWebhookEndpoint.handler(
      endpointRequest(integration.id, body, { 'x-assostack-event-id': eventID('evt-missing-sig') }, payload),
    )
    expect(response.status).toBe(400)
  })

  test('rejects safely when the referenced secret is missing or invalid', async () => {
    const integration = await payload.create({
      collection: 'integrations',
      overrideAccess: true,
      user: asRequestUser({ platformRoles: ['platform-admin'] }) as any,
      data: {
        name: 'Webhook without secret',
        provider: 'webhook',
        status: 'enabled',
        organization: organizationA.id,
        config: {},
        secretRef: { key: suiteSecretKey('UNSET') },
      } as any,
    })
    delete process.env[suiteSecretKey('UNSET')]
    const body = JSON.stringify({ hello: 'world' })

    const response = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integration.id,
        body,
        { 'x-assostack-signature': 'a'.repeat(64), 'x-assostack-event-id': eventID('evt-no-secret') },
        payload,
      ),
    )
    expect(response.status).toBe(503)
    const responseBody = JSON.stringify(await json(response))
    expect(responseBody).toContain('service_unavailable')
    expect(responseBody).not.toContain(suiteSecretKey('UNSET'))
  })

  test('safely rejects a malformed JSON payload', async () => {
    const integration = await createWebhookIntegration(organizationA.id, suiteSecretKey('4'), 'super-secret-4')
    const body = '{ not valid json'
    const signature = sign('super-secret-4', body)

    const response = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integration.id,
        body,
        { 'x-assostack-signature': signature, 'x-assostack-event-id': eventID('evt-malformed') },
        payload,
      ),
    )
    expect(response.status).toBe(400)
  })

  test('returns 503 rather than webhook_invalid when event persistence fails', async () => {
    const integration = await createWebhookIntegration(organizationA.id, suiteSecretKey('persistence'), 'super-secret-persistence')
    const body = JSON.stringify({ hello: 'world' })
    const create = payload.create.bind(payload)
    const createSpy = vi.spyOn(payload, 'create').mockImplementation(async (options: any) => {
      if (options.collection === 'webhook-events') {
        throw new Error('database unavailable')
      }
      return create(options)
    })

    try {
      const response = await integrationWebhookEndpoint.handler(
        endpointRequest(
          integration.id,
          body,
          {
            'x-assostack-signature': sign('super-secret-persistence', body),
            'x-assostack-event-id': eventID('evt-persistence'),
          },
          payload,
        ),
      )
      expect(response.status).toBe(503)
      expect(await json(response)).toEqual({
        error: { code: 'service_unavailable', message: 'Webhook could not be processed.' },
      })
    } finally {
      createSpy.mockRestore()
    }
  })

  test('rejects inbound webhooks for a disabled integration', async () => {
    process.env[suiteSecretKey('5')] = 'super-secret-5'
    const integration = await payload.create({
      collection: 'integrations',
      overrideAccess: true,
      user: asRequestUser({ platformRoles: ['platform-admin'] }) as any,
      data: {
        name: 'Disabled webhook',
        provider: 'webhook',
        status: 'disabled',
        organization: organizationA.id,
        config: {},
        secretRef: { key: suiteSecretKey('5') },
      } as any,
    })
    const body = JSON.stringify({ hello: 'world' })
    const signature = sign('super-secret-5', body)

    const response = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integration.id,
        body,
        { 'x-assostack-signature': signature, 'x-assostack-event-id': eventID('evt-disabled') },
        payload,
      ),
    )
    expect(response.status).toBe(404)
  })

  test('rejects the generic webhook endpoint for a non-webhook integration', async () => {
    const integration = await payload.create({
      collection: 'integrations',
      overrideAccess: true,
      user: asRequestUser({ platformRoles: ['platform-admin'] }) as any,
      data: {
        name: 'Brevo integration',
        provider: 'brevo',
        status: 'enabled',
        organization: organizationA.id,
        config: {},
      } as any,
    })

    const response = await integrationWebhookEndpoint.handler(
      endpointRequest(integration.id, '{}', { 'x-assostack-event-id': eventID('evt-non-webhook') }, payload),
    )
    expect(response.status).toBe(404)
  })

  test('allows the same event ID under a different integration or organization', async () => {
    const integrationOne = await createWebhookIntegration(organizationA.id, suiteSecretKey('6'), 'super-secret-6')
    const integrationTwo = await createWebhookIntegration(organizationA.id, suiteSecretKey('7'), 'super-secret-7')
    const integrationOtherOrg = await createWebhookIntegration(organizationB.id, suiteSecretKey('8'), 'super-secret-8')

    const body = JSON.stringify({ hello: 'world' })

    const responseOne = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integrationOne.id,
        body,
        { 'x-assostack-signature': sign('super-secret-6', body), 'x-assostack-event-id': eventID('evt-shared') },
        payload,
      ),
    )
    const responseTwo = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integrationTwo.id,
        body,
        { 'x-assostack-signature': sign('super-secret-7', body), 'x-assostack-event-id': eventID('evt-shared') },
        payload,
      ),
    )
    const responseOtherOrg = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integrationOtherOrg.id,
        body,
        { 'x-assostack-signature': sign('super-secret-8', body), 'x-assostack-event-id': eventID('evt-shared') },
        payload,
      ),
    )

    expect(responseOne.status).toBe(202)
    expect(responseTwo.status).toBe(202)
    expect(responseOtherOrg.status).toBe(202)

    const events = await payload.find({
      collection: 'webhook-events',
      overrideAccess: true,
      where: { eventId: { equals: eventID('evt-shared') } },
    })
    expect(events.docs).toHaveLength(3)
  })

  test('cannot create two accepted records for a concurrent duplicate delivery', async () => {
    const integration = await createWebhookIntegration(organizationA.id, suiteSecretKey('9'), 'super-secret-9')
    const body = JSON.stringify({ hello: 'world' })
    const signature = sign('super-secret-9', body)

    const [first, second] = await Promise.all([
      integrationWebhookEndpoint.handler(
        endpointRequest(
          integration.id,
          body,
          { 'x-assostack-signature': signature, 'x-assostack-event-id': eventID('evt-concurrent') },
          payload,
        ),
      ),
      integrationWebhookEndpoint.handler(
        endpointRequest(
          integration.id,
          body,
          { 'x-assostack-signature': signature, 'x-assostack-event-id': eventID('evt-concurrent') },
          payload,
        ),
      ),
    ])

    const statuses = [(await json(first)).status, (await json(second)).status].sort()
    expect(statuses).toEqual(['accepted', 'duplicate'])

    const events = await payload.find({
      collection: 'webhook-events',
      overrideAccess: true,
      where: { eventId: { equals: eventID('evt-concurrent') } },
    })
    expect(events.docs).toHaveLength(1)
  })

  test('clears the previous failure health after a valid webhook', async () => {
    const integration = await createWebhookIntegration(organizationA.id, suiteSecretKey('recovery'), 'super-secret-recovery')
    const body = JSON.stringify({ hello: 'world' })

    await integrationWebhookEndpoint.handler(
      endpointRequest(
        integration.id,
        body,
        { 'x-assostack-signature': 'a'.repeat(64), 'x-assostack-event-id': eventID('evt-recovery-failure') },
        payload,
      ),
    )

    const response = await integrationWebhookEndpoint.handler(
      endpointRequest(
        integration.id,
        body,
        {
          'x-assostack-signature': sign('super-secret-recovery', body),
          'x-assostack-event-id': eventID('evt-recovery-success'),
        },
        payload,
      ),
    )
    expect(response.status).toBe(202)

    const updated = await payload.findByID({ collection: 'integrations', id: integration.id, overrideAccess: true })
    expect((updated as any).lastSuccessAt).toBeTruthy()
    expect((updated as any).lastError).toBeNull()
  })

  test('enforces tenant isolation and system-managed access on webhook events', async () => {
    const integrationA = await createWebhookIntegration(organizationA.id, suiteSecretKey('10'), 'super-secret-10')
    const integrationB = await createWebhookIntegration(organizationB.id, suiteSecretKey('11'), 'super-secret-11')

    const bodyA = JSON.stringify({ tenant: 'a' })
    await integrationWebhookEndpoint.handler(
      endpointRequest(
        integrationA.id,
        bodyA,
        { 'x-assostack-signature': sign('super-secret-10', bodyA), 'x-assostack-event-id': eventID('evt-tenant-a') },
        payload,
      ),
    )

    const bodyB = JSON.stringify({ tenant: 'b' })
    await integrationWebhookEndpoint.handler(
      endpointRequest(
        integrationB.id,
        bodyB,
        { 'x-assostack-signature': sign('super-secret-11', bodyB), 'x-assostack-event-id': eventID('evt-tenant-b') },
        payload,
      ),
    )

    const visibleToAdminA = await payload.find({
      collection: 'webhook-events',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
    })
    expect(visibleToAdminA.docs.some((doc: any) => doc.eventId === eventID('evt-tenant-a'))).toBe(true)
    expect(visibleToAdminA.docs.some((doc: any) => doc.eventId === eventID('evt-tenant-b'))).toBe(false)

    await expect(
      payload.find({
        collection: 'webhook-events',
        overrideAccess: false,
        user: asRequestUser(memberA) as any,
      }),
    ).rejects.toThrow()

    const anyEvent = visibleToAdminA.docs[0] as any
    await expect(
      payload.create({
        collection: 'webhook-events',
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: {
          organization: organizationA.id,
          integration: integrationA.id,
          eventId: eventID('evt-manual'),
          idempotencyKey: eventID('manual-key'),
          receivedAt: new Date().toISOString(),
        } as any,
      }),
    ).rejects.toThrow()

    await expect(
      payload.update({
        collection: 'webhook-events',
        id: anyEvent.id,
        overrideAccess: false,
        user: asRequestUser(adminA) as any,
        data: { eventId: 'tampered' } as any,
      }),
    ).rejects.toThrow()
  })
})
