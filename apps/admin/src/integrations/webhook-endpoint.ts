import type { Endpoint, PayloadRequest } from 'payload'

import { createProviderFailureState } from './health'
import { createDefaultIntegrationRegistry } from './registry'
import { createEnvironmentSecretStore, isSecretReference } from './secrets'
import { createPayloadWebhookEventStore } from './webhook-event-store'
import { processInboundWebhook } from './webhooks'

const registry = createDefaultIntegrationRegistry()
const secretStore = createEnvironmentSecretStore()

const routeParam = (req: PayloadRequest, name: string): string | null => {
  const value = req.routeParams?.[name]
  return typeof value === 'string' && value.length > 0 ? value : null
}

const jsonResponse = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

// A generic 404 is used for missing, disabled, and misconfigured integrations so the
// endpoint never reveals which of those conditions applies to an unauthenticated caller.
const webhookNotAvailable = () => jsonResponse(404, { error: { code: 'not_found', message: 'Webhook endpoint is not available.' } })

const webhookInvalid = (message = 'Inbound webhook could not be verified.') =>
  jsonResponse(400, { error: { code: 'webhook_invalid', message } })

const webhookUnavailable = () =>
  jsonResponse(503, { error: { code: 'service_unavailable', message: 'Webhook could not be processed.' } })

// Integration writes always require an acting user in its beforeChange/beforeValidate hooks,
// even with overrideAccess. Health metadata is otherwise field-locked against normal writers.
const systemRequestUser = { collection: 'users' as const, platformRoles: ['platform-admin'] }

const relationshipID = (value: unknown): string | number | null => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? id : null
  }
  return null
}

const updateIntegrationHealth = async (
  req: PayloadRequest,
  integrationID: string | number,
  outcome: { success: true } | { success: false; error: string },
): Promise<void> => {
  try {
    const data = outcome.success
      ? { lastSuccessAt: new Date().toISOString(), lastError: null }
      : createProviderFailureState(new Error(outcome.error))

    await req.payload.update({
      collection: 'integrations',
      id: integrationID,
      overrideAccess: true,
      user: systemRequestUser as never,
      data: data as never,
    })
  } catch (error) {
    req.payload.logger.warn({ err: error }, 'Failed to update integration health metadata.')
  }
}

export const integrationWebhookEndpoint: Endpoint = {
  path: '/integrations/:id/webhook',
  method: 'post',
  handler: async (req) => {
    const integrationID = routeParam(req, 'id')
    if (!integrationID) {
      return webhookNotAvailable()
    }

    let integration: Record<string, unknown> | null = null
    try {
      integration = (await req.payload.findByID({
        collection: 'integrations',
        id: integrationID,
        overrideAccess: true,
      })) as unknown as Record<string, unknown>
    } catch {
      return webhookNotAvailable()
    }

    if (!integration || integration.provider !== 'webhook' || integration.status !== 'enabled') {
      return webhookNotAvailable()
    }

    const organizationID = relationshipID(integration.organization)
    const adapter = registry.get('webhook')
    if (!organizationID || !adapter?.verifyInboundWebhook || !adapter.validateConfig(integration.config)) {
      return webhookNotAvailable()
    }

    let secret: unknown
    try {
      const secretRef = integration.secretRef
      if (!isSecretReference(secretRef)) {
        throw new Error('Webhook signing secret is unavailable.')
      }
      secret = await secretStore.resolve(secretRef)
      if (typeof secret !== 'string' || secret.trim().length === 0) {
        throw new Error('Webhook signing secret is unavailable.')
      }
    } catch {
      await updateIntegrationHealth(req, integration.id as string | number, {
        success: false,
        error: 'Webhook signing secret is unavailable.',
      })
      return webhookUnavailable()
    }

    let body: string
    try {
      body = (await req.text?.()) ?? ''
    } catch {
      return webhookInvalid('Request body could not be read.')
    }

    let result
    try {
      const store = createPayloadWebhookEventStore(req.payload)
      result = await processInboundWebhook({
        adapter,
        body,
        config: integration.config,
        headers: req.headers,
        integrationID: integration.id as string | number,
        organizationID,
        secret,
        store,
        logger: req.payload.logger as never,
      })
    } catch {
      await updateIntegrationHealth(req, integration.id as string | number, {
        success: false,
        error: 'Webhook persistence failed.',
      })
      return webhookUnavailable()
    }

    if (result.status === 'accepted') {
      await updateIntegrationHealth(req, integration.id as string | number, { success: true })
      return jsonResponse(202, { status: 'accepted', eventId: result.eventID })
    }

    if (result.status === 'duplicate') {
      return jsonResponse(200, { status: 'duplicate', eventId: result.eventID })
    }

    await updateIntegrationHealth(req, integration.id as string | number, {
      success: false,
      error: result.error.message,
    })
    return webhookInvalid()
  },
}

export const integrationEndpoints: Endpoint[] = [integrationWebhookEndpoint]
