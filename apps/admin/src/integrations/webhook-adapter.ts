import { createHmac, timingSafeEqual } from 'node:crypto'

import type { IntegrationAdapter } from './types'

export type WebhookAdapterConfig = {
  signatureHeader?: string
  eventIdHeader?: string
}

const DEFAULT_SIGNATURE_HEADER = 'x-assostack-signature'
const DEFAULT_EVENT_ID_HEADER = 'x-assostack-event-id'
const ALLOWED_CONFIG_KEYS = new Set(['signatureHeader', 'eventIdHeader'])
const HEX_DIGEST_PATTERN = /^[0-9a-f]{64}$/i

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

export const validateWebhookAdapterConfig = (config: unknown): config is WebhookAdapterConfig => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return false
  }

  return Object.entries(config as Record<string, unknown>).every(
    ([key, value]) => ALLOWED_CONFIG_KEYS.has(key) && isNonEmptyString(value),
  )
}

const resolveConfig = (config: WebhookAdapterConfig) => ({
  signatureHeader: config.signatureHeader ?? DEFAULT_SIGNATURE_HEADER,
  eventIdHeader: config.eventIdHeader ?? DEFAULT_EVENT_ID_HEADER,
})

const extractHexDigest = (headerValue: string): string | null => {
  const trimmed = headerValue.trim()
  const withoutPrefix = trimmed.toLowerCase().startsWith('sha256=') ? trimmed.slice(7) : trimmed
  return HEX_DIGEST_PATTERN.test(withoutPrefix) ? withoutPrefix.toLowerCase() : null
}

const timingSafeHexEqual = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a, 'hex')
  const bufferB = Buffer.from(b, 'hex')
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
}

export const createWebhookAdapter = (): IntegrationAdapter<WebhookAdapterConfig> => ({
  provider: 'webhook',
  capabilities: ['inbound-webhooks'],
  validateConfig: validateWebhookAdapterConfig,
  verifyInboundWebhook: async ({ body, config, headers, secret }) => {
    if (!isNonEmptyString(secret)) {
      throw new Error('This integration does not have a usable signing secret.')
    }

    const { signatureHeader, eventIdHeader } = resolveConfig(config)

    const signatureHeaderValue = headers.get(signatureHeader)
    if (!isNonEmptyString(signatureHeaderValue)) {
      throw new Error('The inbound webhook request is missing its signature header.')
    }

    const providedDigest = extractHexDigest(signatureHeaderValue)
    if (!providedDigest) {
      throw new Error('The inbound webhook signature is malformed.')
    }

    const expectedDigest = createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    if (!timingSafeHexEqual(providedDigest, expectedDigest)) {
      throw new Error('The inbound webhook signature could not be verified.')
    }

    const eventIdHeaderValue = headers.get(eventIdHeader)
    if (!isNonEmptyString(eventIdHeaderValue)) {
      throw new Error('The inbound webhook request is missing its event identifier header.')
    }

    let payload: unknown
    try {
      payload = body.length > 0 ? JSON.parse(body) : {}
    } catch {
      throw new Error('The inbound webhook payload is not valid JSON.')
    }

    return { eventID: eventIdHeaderValue.trim(), payload }
  },
})
