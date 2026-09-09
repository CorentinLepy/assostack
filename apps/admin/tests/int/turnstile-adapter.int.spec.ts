import { describe, expect, test, vi } from 'vitest'

import { createDefaultIntegrationRegistry } from '../../src/integrations/registry'
import { createTurnstileAdapter, type TurnstileAdapterConfig, type TurnstileFetch } from '../../src/integrations/turnstile-adapter'

const fakeSecret = 'test-turnstile-secret-do-not-log'
const config: TurnstileAdapterConfig = {}
const context = { organizationID: 'organization-1', integrationID: 'integration-1', signal: new AbortController().signal }

const setup = () => {
  const fetchImpl = vi.fn<TurnstileFetch>().mockResolvedValue(new Response(JSON.stringify({ success: true, secret: fakeSecret }), { status: 200 }))
  const logger = { error: vi.fn(), warn: vi.fn() }
  const input = { config, context, logger, token: 'fictional-token', remoteIP: '192.0.2.1', secret: fakeSecret }
  return { adapter: createTurnstileAdapter(fetchImpl), fetchImpl, input, logger }
}

describe('Cloudflare Turnstile adapter (no network)', () => {
  test('accepts only the empty non-sensitive config', () => {
    const { adapter } = setup()
    expect(adapter.validateConfig({})).toBe(true)
    expect(adapter.validateConfig(null)).toBe(false)
    expect(adapter.validateConfig([])).toBe(false)
    expect(adapter.validateConfig({ siteKey: 'public-site-key' })).toBe(false)
  })

  test.each([
    { config: { unknown: true } }, { token: '' }, { token: ' ' }, { token: 123 }, { secret: undefined },
    { secret: '' }, { secret: ' ' }, { remoteIP: '' }, { remoteIP: 123 },
  ])('rejects invalid input before fetch (%#)', async (overrides) => {
    const { adapter, fetchImpl, input } = setup()
    await expect(adapter.verifyChallenge!({ ...input, ...overrides } as typeof input)).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('posts the provider-neutral challenge data and forwards the AbortSignal', async () => {
    const { adapter, fetchImpl, input, logger } = setup()
    await expect(adapter.verifyChallenge!(input)).resolves.toEqual({ verified: true })
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(init).toMatchObject({ method: 'POST', signal: context.signal, redirect: 'error' })
    expect(init?.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' })
    expect(Object.fromEntries(new URLSearchParams(init!.body as string))).toEqual({ secret: fakeSecret, response: 'fictional-token', remoteip: '192.0.2.1' })
    expect(JSON.stringify({ verified: true })).not.toContain(fakeSecret)
    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('maps a failed challenge to the generic result', async () => {
    const { adapter, fetchImpl, input } = setup()
    fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 }))
    await expect(adapter.verifyChallenge!(input)).resolves.toEqual({ verified: false })
  })

  test.each([400, 500])('throws a safe HTTP error for provider status %i', async (status) => {
    const { adapter, fetchImpl, input, logger } = setup()
    fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify({ secret: fakeSecret }), { status }))
    const error = await adapter.verifyChallenge!(input).catch((value: unknown) => value)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(`Cloudflare Turnstile verification request failed with HTTP ${status}.`)
    expect(String(error)).not.toContain(fakeSecret)
    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test.each(['network', 'json'])('sanitizes %s failures', async (kind) => {
    const { adapter, fetchImpl, input } = setup()
    if (kind === 'network') fetchImpl.mockRejectedValueOnce(new Error(`secret=${fakeSecret}`))
    if (kind === 'json') fetchImpl.mockResolvedValueOnce(new Response(fakeSecret, { status: 200 }))
    const error = await adapter.verifyChallenge!(input).catch((value: unknown) => value)
    expect(String(error)).not.toContain(fakeSecret)
    expect(error).not.toHaveProperty('cause')
  })

  test('registers Turnstile as real while retaining unrelated placeholders and real adapters', () => {
    const registry = createDefaultIntegrationRegistry()
    expect(registry.get('cloudflare-turnstile')?.capabilities).toEqual(['anti-abuse'])
    expect(registry.get('cloudflare-turnstile')?.verifyChallenge).toBeTypeOf('function')
    expect(registry.get('smtp')?.sendEmail).toBeTypeOf('function')
    expect(registry.get('brevo')?.sendEmail).toBeTypeOf('function')
    expect(registry.get('webhook')?.verifyInboundWebhook).toBeTypeOf('function')
    expect(registry.get('helloasso')?.execute).toBeTypeOf('function')
    expect(registry.get('cloudflare-r2')?.execute).toBeTypeOf('function')
    expect(registry.get('automation')?.execute).toBeTypeOf('function')
  })
})