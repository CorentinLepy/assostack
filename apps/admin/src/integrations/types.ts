import type { RelationshipID } from '../access/organizations'
import type { EmailDeliveryResult, EmailMessage } from './email'

export const integrationProviders = [
  'helloasso',
  'brevo',
  'smtp',
  'cloudflare-r2',
  'cloudflare-turnstile',
  'webhook',
  'automation',
] as const

export type IntegrationProvider = (typeof integrationProviders)[number]

export type IntegrationCapability = 'execute' | 'inbound-webhooks' | 'outbound-webhooks' | 'email' | 'anti-abuse'

export type IntegrationExecutionContext = {
  organizationID: RelationshipID
  integrationID: RelationshipID
  idempotencyKey?: string
  signal?: AbortSignal
}

export type IntegrationLogger = {
  error: (message: string, details?: Record<string, unknown>) => void
  warn: (message: string, details?: Record<string, unknown>) => void
}

export type IntegrationAdapter<TConfig extends Record<string, unknown> = Record<string, unknown>> = {
  provider: IntegrationProvider
  capabilities: readonly IntegrationCapability[]
  validateConfig: (config: unknown) => config is TConfig
  sendEmail?: (input: {
    config: TConfig
    context: IntegrationExecutionContext
    logger: IntegrationLogger
    message: EmailMessage
    secret: unknown
  }) => Promise<EmailDeliveryResult>
  verifyChallenge?: (input: {
    config: TConfig
    context: IntegrationExecutionContext
    logger: IntegrationLogger
    token: string
    remoteIP?: string
    secret: unknown
  }) => Promise<{ verified: boolean }>
  execute?: (input: {
    config: TConfig
    context: IntegrationExecutionContext
    logger: IntegrationLogger
  }) => Promise<{ status: 'accepted' | 'not-implemented' }>
  verifyInboundWebhook?: (input: {
    body: string
    config: TConfig
    headers: Headers
    secret: unknown
  }) => Promise<{ eventID: string; payload: unknown }>
}

export type IntegrationError = {
  code: 'configuration-invalid' | 'provider-error' | 'webhook-invalid' | 'webhook-duplicate'
  message: string
}
