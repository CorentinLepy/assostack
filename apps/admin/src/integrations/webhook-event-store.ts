import type { Payload } from 'payload'
import { ValidationError } from 'payload'

import type { WebhookEventStore } from './webhooks'

const IDEMPOTENCY_CONSTRAINT = 'webhook_events_idempotency_key_idx'

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object')

const identifiesIdempotencyUniqueness = (error: ValidationError): boolean =>
  error.data?.errors?.some(
    (fieldError) =>
      fieldError.path === 'idempotencyKey' && /unique|duplicate|already exists/i.test(String(fieldError.message ?? '')),
  ) ?? false

const isUniqueConstraintViolation = (error: unknown): boolean => {
  if (error instanceof ValidationError) {
    return identifiesIdempotencyUniqueness(error)
  }

  const examined = new Set<object>()
  let current: unknown = error
  while (isRecord(current) && !examined.has(current)) {
    examined.add(current)
    if (current.code === '23505' && current.constraint === IDEMPOTENCY_CONSTRAINT) {
      return true
    }
    current = current.cause
  }

  return false
}

export const createPayloadWebhookEventStore = (payload: Payload): WebhookEventStore => ({
  recordIfNew: async ({ eventID, integrationID, organizationID }) => {
    const idempotencyKey = `${organizationID}:${integrationID}:${eventID}`

    try {
      await payload.create({
        collection: 'webhook-events',
        overrideAccess: true,
        data: {
          organization: organizationID,
          integration: integrationID,
          eventId: eventID,
          idempotencyKey,
          receivedAt: new Date().toISOString(),
        } as never,
      })
      return 'accepted'
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return 'duplicate'
      }
      throw error
    }
  },
})
