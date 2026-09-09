import type { IntegrationAdapter } from './types'

export type TurnstileAdapterConfig = Record<string, never>

export type TurnstileFetch = (input: string | URL, init?: RequestInit) => Promise<Response>

const TURNSTILE_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const hasContent = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

export const validateTurnstileAdapterConfig = (config: unknown): config is TurnstileAdapterConfig =>
  Boolean(config && typeof config === 'object' && !Array.isArray(config) && Object.keys(config).length === 0)

export const createTurnstileAdapter = (
  fetchImpl: TurnstileFetch = globalThis.fetch,
): IntegrationAdapter<TurnstileAdapterConfig> => ({
  provider: 'cloudflare-turnstile',
  capabilities: ['anti-abuse'],
  validateConfig: validateTurnstileAdapterConfig,
  verifyChallenge: async ({ config, context, token, remoteIP, secret }) => {
    if (!validateTurnstileAdapterConfig(config)) throw new Error('Invalid Cloudflare Turnstile configuration.')
    if (!hasContent(token)) throw new Error('A Turnstile challenge token is required.')
    if (remoteIP !== undefined && !hasContent(remoteIP)) throw new Error('The Turnstile remote IP is invalid.')
    if (!hasContent(secret)) throw new Error('This integration does not have a usable Turnstile secret.')

    const body = new URLSearchParams({ secret, response: token, ...(remoteIP === undefined ? {} : { remoteip: remoteIP }) })
    let response: Response
    try {
      response = await fetchImpl(TURNSTILE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: context.signal,
        redirect: 'error',
        body: body.toString(),
      })
    } catch {
      throw new Error('Cloudflare Turnstile verification request failed.')
    }
    if (!response.ok) {
      throw new Error(`Cloudflare Turnstile verification request failed with HTTP ${response.status}.`)
    }

    let result: unknown
    try {
      result = await response.json()
    } catch {
      throw new Error('Cloudflare Turnstile verification response was not valid JSON.')
    }

    return { verified: Boolean(result && typeof result === 'object' && 'success' in result && result.success === true) }
  },
})