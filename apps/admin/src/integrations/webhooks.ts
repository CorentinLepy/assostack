import { sanitizeProviderError } from './secrets'
import type { IntegrationAdapter, IntegrationError, IntegrationLogger } from './types'

export type WebhookEventStore = {
  // Must be atomic: concurrent duplicate deliveries must never both resolve to 'accepted'.
  recordIfNew: (input: {
    eventID: string
    integrationID: string | number
    organizationID: string | number
  }) => Promise<'accepted' | 'duplicate'>
}

export type InboundWebhookInput = {
  adapter: IntegrationAdapter
  body: string
  config: unknown
  headers: Headers
  integrationID: string | number
  organizationID: string | number
  secret: unknown
  store: WebhookEventStore
  logger?: IntegrationLogger
}

export type InboundWebhookResult =
  | { status: 'accepted'; eventID: string; payload: unknown }
  | { status: 'duplicate'; eventID: string }
  | { status: 'rejected'; error: IntegrationError }

export const processInboundWebhook = async ({
  adapter,
  body,
  config,
  headers,
  integrationID,
  organizationID,
  secret,
  store,
  logger,
}: InboundWebhookInput): Promise<InboundWebhookResult> => {
  if (!adapter.verifyInboundWebhook) {
    return {
      status: 'rejected',
      error: { code: 'webhook-invalid', message: 'This integration does not accept inbound webhooks.' },
    }
  }

  let verified: { eventID: string; payload: unknown }
  try {
    verified = await adapter.verifyInboundWebhook({ body, config: config as never, headers, secret })
  } catch (error) {
    logger?.warn('Inbound integration webhook rejected.', { organizationID, integrationID })
    return {
      status: 'rejected',
      error: { code: 'webhook-invalid', message: sanitizeProviderError(error) },
    }
  }

  const outcome = await store.recordIfNew({ eventID: verified.eventID, integrationID, organizationID })
  if (outcome === 'duplicate') {
    return { status: 'duplicate', eventID: verified.eventID }
  }

  return { status: 'accepted', eventID: verified.eventID, payload: verified.payload }
}
