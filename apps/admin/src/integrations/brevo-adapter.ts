import { validateEmailMessage } from './email'
import type { IntegrationAdapter } from './types'

export type BrevoAdapterConfig = {
  fromAddress: string
  fromName?: string
}

/** Provider-local HTTP boundary for network-free adapter tests. */
export type BrevoFetch = (input: string | URL, init?: RequestInit) => Promise<Response>

const allowedKeys = new Set(['fromAddress', 'fromName'])
const hasContent = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const validateBrevoAdapterConfig = (config: unknown): config is BrevoAdapterConfig => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return false
  const value = config as Record<string, unknown>
  return (
    Object.keys(value).every((key) => allowedKeys.has(key)) &&
    hasContent(value.fromAddress) &&
    /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value.fromAddress.trim()) &&
    (value.fromName === undefined || hasContent(value.fromName))
  )
}

export const createBrevoAdapter = (
  fetchImpl: BrevoFetch = globalThis.fetch,
): IntegrationAdapter<BrevoAdapterConfig> => ({
  provider: 'brevo',
  capabilities: ['email'],
  validateConfig: validateBrevoAdapterConfig,
  sendEmail: async ({ config, context, message, secret }) => {
    if (!validateBrevoAdapterConfig(config)) throw new Error('Invalid Brevo configuration.')
    if (!validateEmailMessage(message)) throw new Error('Invalid email message.')
    if (!hasContent(secret)) throw new Error('This integration does not have a usable Brevo API key.')

    let response: Response
    try {
      response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'api-key': secret },
        signal: context.signal,
        redirect: 'error',
        body: JSON.stringify({
          sender: {
            email: config.fromAddress.trim(),
            ...(config.fromName === undefined ? {} : { name: config.fromName.trim() }),
          },
          to: (Array.isArray(message.to) ? message.to : [message.to]).map((email) => ({ email: email.trim() })),
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html,
          ...(message.replyTo === undefined ? {} : { replyTo: { email: message.replyTo.trim() } }),
        }),
      })
    } catch {
      // Fetch errors can contain credentials; do not retain the raw error or its cause.
      throw new Error('Brevo transactional email request failed.')
    }
    if (!response.ok) {
      throw new Error(`Brevo transactional email request failed with HTTP ${response.status}.`)
    }

    let result: unknown
    try {
      result = await response.json()
    } catch {
      throw new Error('Brevo transactional email response was not valid JSON.')
    }
    const messageID = result && typeof result === 'object' && 'messageId' in result ? result.messageId : undefined
    // Only the optional identifier crosses the provider boundary, never a raw response.
    if (typeof messageID === 'string' && messageID.includes(secret)) {
      throw new Error('Brevo transactional email response contained an invalid message identifier.')
    }
    return { status: 'accepted', ...(typeof messageID === 'string' ? { messageID } : {}) }
  },
})
