import { describe, expect, test, vi } from 'vitest'

import { createBrevoAdapter, type BrevoAdapterConfig, type BrevoFetch } from '../../src/integrations/brevo-adapter'
import type { EmailMessage } from '../../src/integrations/email'
import { createDefaultIntegrationRegistry } from '../../src/integrations/registry'

const fakeKey = 'test-brevo-api-key-do-not-log'
const config = { fromAddress: ' sender@example.test ', fromName: ' Example Association ' }
const message: EmailMessage = { to: ' reader@example.test ', subject: 'Hello', text: 'Hello reader' }
const setup = () => {
  const fetchImpl = vi.fn<BrevoFetch>().mockResolvedValue(new Response(JSON.stringify({ messageId: 'message-1', key: fakeKey }), { status: 201 }))
  const logger = { error: vi.fn(), warn: vi.fn() }
  const input = {
    config, message, secret: fakeKey, logger,
    context: { organizationID: 'organization-1', integrationID: 'integration-1', signal: new AbortController().signal, idempotencyKey: 'unused-key' },
  }
  return { fetchImpl, logger, input, adapter: createBrevoAdapter(fetchImpl) }
}

describe('Brevo transactional email (no network)', () => {
  test('accepts strict config', () => {
    const { adapter } = setup()
    expect(adapter.validateConfig(config)).toBe(true)
    expect(adapter.validateConfig({ fromAddress: 'sender@example.test' })).toBe(true)
  })

  test.each([
    null, [], {}, { ...config, apiKey: fakeKey }, { ...config, endpoint: 'https://example.test' },
    { ...config, baseURL: 'https://example.test' }, { ...config, extra: true },
    { ...config, fromAddress: ' ' }, { ...config, fromAddress: 'invalid' },
    { ...config, fromName: '' }, { ...config, fromName: 1 },
  ])('rejects invalid config before HTTP (%#)', async (invalidConfig) => {
    const { adapter, fetchImpl, input } = setup()
    expect(adapter.validateConfig(invalidConfig)).toBe(false)
    await expect(adapter.sendEmail!({ ...input, config: invalidConfig as BrevoAdapterConfig })).rejects.toThrow('configuration')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test.each([undefined, null, '', ' ', 123])('rejects unusable secrets before HTTP (%#)', async (secret) => {
    const { adapter, fetchImpl, input } = setup()
    await expect(adapter.sendEmail!({ ...input, secret })).rejects.toThrow('API key')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test.each([
    null, {}, { ...message, to: [] }, { ...message, to: '' },
    { ...message, subject: ' ' }, { ...message, text: undefined }, { ...message, replyTo: '' },
  ])('rejects invalid messages before HTTP (%#)', async (invalidMessage) => {
    const { adapter, fetchImpl, input } = setup()
    await expect(adapter.sendEmail!({ ...input, message: invalidMessage as EmailMessage })).rejects.toThrow('email message')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('validates config, message, then secret', async () => {
    const { adapter, fetchImpl, input } = setup()
    await expect(adapter.sendEmail!({ ...input, config: {} as BrevoAdapterConfig, message: {} as EmailMessage, secret: undefined })).rejects.toThrow('configuration')
    await expect(adapter.sendEmail!({ ...input, message: {} as EmailMessage, secret: undefined })).rejects.toThrow('email message')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('posts one text email with authentication only in headers and forwards the signal', async () => {
    const { adapter, fetchImpl, logger, input } = setup()
    const result = await adapter.sendEmail!(input)
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init).toMatchObject({ method: 'POST', signal: input.context.signal, redirect: 'error' })
    expect(init?.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/json', 'api-key': fakeKey })
    expect(JSON.parse(init!.body as string)).toEqual({
      sender: { email: 'sender@example.test', name: 'Example Association' },
      to: [{ email: 'reader@example.test' }], subject: 'Hello', textContent: 'Hello reader',
    })
    expect(init!.body).not.toContain(fakeKey)
    expect(init!.body).not.toContain(input.context.idempotencyKey)
    expect(result).toEqual({ status: 'accepted', messageID: 'message-1' })
    expect(JSON.stringify(result)).not.toContain(fakeKey)
    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('preserves credentials without trimming', async () => {
    const { adapter, fetchImpl, input } = setup()
    await adapter.sendEmail!({ ...input, secret: ` ${fakeKey} ` })
    expect(fetchImpl.mock.calls[0][1]?.headers).toHaveProperty('api-key', ` ${fakeKey} `)
  })

  test.each([undefined, 'Plain text'])('maps HTML, optional text, multiple recipients and replyTo (%#)', async (text) => {
    const { adapter, fetchImpl, input } = setup()
    await adapter.sendEmail!({ ...input, config: { fromAddress: 'sender@example.test' }, message: {
      to: ['one@example.test', ' two@example.test '], subject: 'HTML', text,
      html: '<p>Hello</p>', replyTo: ' replies@example.test ',
    } })
    expect(JSON.parse(fetchImpl.mock.calls[0][1]!.body as string)).toEqual({
      sender: { email: 'sender@example.test' },
      to: [{ email: 'one@example.test' }, { email: 'two@example.test' }],
      subject: 'HTML', htmlContent: '<p>Hello</p>', ...(text === undefined ? {} : { textContent: text }),
      replyTo: { email: 'replies@example.test' },
    })
  })

  test('accepts a successful response without messageId', async () => {
    const { adapter, fetchImpl, input } = setup()
    fetchImpl.mockResolvedValueOnce(new Response('{}', { status: 201 }))
    await expect(adapter.sendEmail!(input)).resolves.toEqual({ status: 'accepted' })
  })

  test.each([400, 401, 429, 500])('throws a safe HTTP %i error without logging or exposing the response', async (status) => {
    const { adapter, fetchImpl, input, logger } = setup()
    fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify({ error: fakeKey }), { status }))
    const error = await adapter.sendEmail!(input).catch((error: unknown) => error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(`Brevo transactional email request failed with HTTP ${status}.`)
    expect(String(error)).not.toContain(fakeKey)
    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test.each(['network', 'json', 'identifier'])('sanitizes %s failures without retaining credentials', async (kind) => {
    const { adapter, fetchImpl, input, logger } = setup()
    if (kind === 'network') fetchImpl.mockRejectedValueOnce(new Error(`Request api-key=${fakeKey} failed`))
    if (kind === 'json') fetchImpl.mockResolvedValueOnce(new Response(fakeKey, { status: 201 }))
    if (kind === 'identifier') fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify({ messageId: fakeKey }), { status: 201 }))
    const error = await adapter.sendEmail!(input).catch((error: unknown) => error)
    expect(error).toBeInstanceOf(Error)
    expect(String(error)).not.toContain(fakeKey)
    expect(error).not.toHaveProperty('cause')
    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('registers Brevo alongside real SMTP and webhook adapters, preserving other placeholders', async () => {
    const registry = createDefaultIntegrationRegistry()
    for (const provider of ['brevo', 'smtp']) {
      expect(registry.get(provider)?.capabilities).toEqual(['email'])
      expect(registry.get(provider)?.sendEmail).toBeTypeOf('function')
      expect(registry.get(provider)?.execute).toBeUndefined()
    }
    expect(registry.get('webhook')?.verifyInboundWebhook).toBeTypeOf('function')
    for (const provider of ['helloasso', 'cloudflare-r2', 'cloudflare-turnstile', 'automation']) {
      const adapter = registry.get(provider)!
      expect(adapter.sendEmail).toBeUndefined()
      await expect(adapter.execute!(setup().input)).resolves.toEqual({ status: 'not-implemented' })
    }
  })
})
