import { sanitizeProviderError } from './secrets'
import type { IntegrationAdapter, IntegrationError, IntegrationLogger } from './types'

export type WebhookEventStore = {
  has: (key: string) => Promise<boolean>
  record: (key: string) => Promise<void>
}

export type InboundWebhookInput = {
  adapter: IntegrationAdapter
  body: string
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

  try {
    const verified = await adapter.verifyInboundWebhook({ body, headers, secret })
    const idempotencyKey = `${organizationID}:${integrationID}:${verified.eventID}`

    if (await store.has(idempotencyKey)) {
      return { status: 'duplicate', eventID: verified.eventID }
    }

    await store.record(idempotencyKey)
    return { status: 'accepted', eventID: verified.eventID, payload: verified.payload }
  } catch (error) {
    logger?.warn('Inbound integration webhook rejected.', { organizationID, integrationID })
    return {
      status: 'rejected',
      error: { code: 'webhook-invalid', message: sanitizeProviderError(error) },
    }
  }
}
