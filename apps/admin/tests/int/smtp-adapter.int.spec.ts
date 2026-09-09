import { describe, expect, test, vi } from 'vitest'

import type { EmailMessage } from '../../src/integrations/email'
import { createDefaultIntegrationRegistry } from '../../src/integrations/registry'
import { createSMTPAdapter, type SMTPAdapterConfig } from '../../src/integrations/smtp-adapter'

const config: SMTPAdapterConfig = {
  host: ' smtp.example.test ', port: 587, secure: false,
  username: ' sender ', fromAddress: ' sender@example.test ', fromName: ' Example, Association ',
}
const message: EmailMessage = { to: ' reader@example.test ', subject: ' Hello ', text: 'Hello reader' }
const context = { organizationID: 'organization-1', integrationID: 'integration-1' }
const secret = 'fictional-smtp-password'

const setup = () => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'message-1', credentials: secret })
  const createTransport = vi.fn(() => ({ sendMail }))
  const logger = { error: vi.fn(), warn: vi.fn() }
  const adapter = createSMTPAdapter(createTransport)
  const input = { config, context, logger, message, secret }
  return { adapter, createTransport, sendMail, logger, input }
}

describe('SMTP email adapter (no network)', () => {
  test('validates strict configuration and keeps the password outside config', () => {
    const { adapter } = setup()
    expect(adapter.validateConfig(config)).toBe(true)
    expect(config).not.toHaveProperty('password')
    expect(adapter.validateConfig({ ...config, password: secret })).toBe(false)
  })

  test.each([
    null, [], {}, { ...config, extra: true }, { ...config, password: secret },
    ...[0, 65536, 1.5, '587', NaN].map((port) => ({ ...config, port })),
    { ...config, host: ' ' }, { ...config, secure: 'false' },
    { ...config, username: '' }, { ...config, fromName: ' ' },
    { ...config, fromAddress: 'invalid' },
  ])('rejects malformed config before creating a transport (%#)', async (invalidConfig) => {
    const { adapter, createTransport, input } = setup()
    expect(adapter.validateConfig(invalidConfig)).toBe(false)
    await expect(adapter.sendEmail!({ ...input, config: invalidConfig as SMTPAdapterConfig })).rejects.toThrow('configuration')
    expect(createTransport).not.toHaveBeenCalled()
  })

  test.each([undefined, null, '', ' ', 123])('requires a non-empty secret with username (%#)', async (invalidSecret) => {
    const { adapter, createTransport, input } = setup()
    await expect(adapter.sendEmail!({ ...input, secret: invalidSecret })).rejects.toThrow('password')
    expect(createTransport).not.toHaveBeenCalled()
  })

  test('sends exactly one text email with normalized SMTP options and structured From', async () => {
    const { adapter, createTransport, sendMail, input } = setup()
    const result = await adapter.sendEmail!(input)
    expect(createTransport).toHaveBeenCalledExactlyOnceWith({
      host: 'smtp.example.test', port: 587, secure: false, auth: { user: 'sender', pass: secret },
    })
    expect(sendMail).toHaveBeenCalledExactlyOnceWith({
      from: { name: 'Example, Association', address: 'sender@example.test' },
      to: 'reader@example.test', subject: 'Hello', text: 'Hello reader', html: undefined, replyTo: undefined,
    })
    expect(result).toEqual({ status: 'accepted', messageID: 'message-1' })
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  test('allows unauthenticated secure SMTP without a secret or From name', async () => {
    const { adapter, createTransport, sendMail, input } = setup()
    const { username: _username, fromName: _fromName, ...anonymousConfig } = config
    await adapter.sendEmail!({ ...input, config: { ...anonymousConfig, port: 465, secure: true }, secret: undefined })
    expect(createTransport).toHaveBeenCalledExactlyOnceWith({ host: 'smtp.example.test', port: 465, secure: true })
    expect(sendMail.mock.calls[0][0].from).toEqual({ name: '', address: 'sender@example.test' })
  })

  test('forwards HTML, multiple recipients and replyTo', async () => {
    const { adapter, sendMail, input } = setup()
    await adapter.sendEmail!({ ...input, message: {
      to: [' first@example.test ', 'second@example.test'], subject: 'HTML',
      html: '<p>Hello</p>', replyTo: ' replies@example.test ',
    } })
    expect(sendMail).toHaveBeenCalledOnce()
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: ['first@example.test', 'second@example.test'], html: '<p>Hello</p>',
      text: undefined, replyTo: 'replies@example.test',
    })
  })

  test.each([
    null, {}, { ...message, to: [] }, { ...message, to: ' ' },
    { ...message, to: ['valid@example.test', ''] }, { ...message, subject: ' ' },
    { ...message, subject: 1 }, { ...message, text: ' ', html: '' },
    { ...message, text: undefined }, { ...message, html: 1 }, { ...message, replyTo: '' },
  ])('rejects malformed messages before creating a transport (%#)', async (invalidMessage) => {
    const { adapter, createTransport, input } = setup()
    await expect(adapter.sendEmail!({ ...input, message: invalidMessage as EmailMessage })).rejects.toThrow('email message')
    expect(createTransport).not.toHaveBeenCalled()
  })

  test('does not require a provider message ID', async () => {
    const { adapter, sendMail, input } = setup()
    sendMail.mockResolvedValueOnce({})
    await expect(adapter.sendEmail!(input)).resolves.toEqual({ status: 'accepted' })
  })

  test('propagates provider failure without logging credential-shaped errors', async () => {
    const { adapter, sendMail, logger, input } = setup()
    const failure = new Error(`Authentication failed password=${secret}`)
    sendMail.mockRejectedValueOnce(failure)
    await expect(adapter.sendEmail!(input)).rejects.toBe(failure)
    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('propagates transport creation failure', async () => {
    const failure = new Error('Transport unavailable')
    const adapter = createSMTPAdapter(() => { throw failure })
    await expect(adapter.sendEmail!(setup().input)).rejects.toBe(failure)
  })

  test('registers real SMTP and webhook adapters while Brevo remains a placeholder', async () => {
    const registry = createDefaultIntegrationRegistry()
    expect(registry.get('smtp')?.capabilities).toEqual(['email'])
    expect(registry.get('smtp')?.sendEmail).toBeTypeOf('function')
    expect(registry.get('smtp')?.execute).toBeUndefined()
    expect(registry.get('webhook')?.verifyInboundWebhook).toBeTypeOf('function')
    const brevo = registry.get('brevo')!
    expect(brevo.sendEmail).toBeUndefined()
    await expect(brevo.execute!(setup().input)).resolves.toEqual({ status: 'not-implemented' })
  })
})
