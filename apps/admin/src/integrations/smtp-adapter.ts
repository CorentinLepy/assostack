import nodemailer from 'nodemailer'

import { validateEmailMessage, type EmailMessage } from './email'
import type { IntegrationAdapter } from './types'

export type SMTPAdapterConfig = {
  host: string
  port: number
  secure: boolean
  username?: string
  fromAddress: string
  fromName?: string
}

type SMTPTransportOptions = {
  host: string
  port: number
  secure: boolean
  auth?: { user: string; pass: string }
}

/** Provider-local seam for tests; no transport types enter the generic contract. */
export type SMTPTransportFactory = (options: SMTPTransportOptions) => {
  sendMail: (message: EmailMessage & { from: { name: string; address: string } }) =>
    Promise<{ messageId?: string }>
}

const allowedKeys = new Set(['host', 'port', 'secure', 'username', 'fromAddress', 'fromName'])
const hasContent = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const validateSMTPAdapterConfig = (config: unknown): config is SMTPAdapterConfig => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return false
  const value = config as Record<string, unknown>
  return (
    Object.keys(value).every((key) => allowedKeys.has(key)) &&
    hasContent(value.host) &&
    typeof value.port === 'number' && Number.isInteger(value.port) && value.port >= 1 && value.port <= 65535 &&
    typeof value.secure === 'boolean' &&
    (value.username === undefined || hasContent(value.username)) &&
    hasContent(value.fromAddress) && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value.fromAddress.trim()) &&
    (value.fromName === undefined || hasContent(value.fromName))
  )
}

export const createSMTPAdapter = (
  createTransport: SMTPTransportFactory = (options) => nodemailer.createTransport(options),
): IntegrationAdapter<SMTPAdapterConfig> => ({
  provider: 'smtp',
  capabilities: ['email'],
  validateConfig: validateSMTPAdapterConfig,
  sendEmail: async ({ config, message, secret }) => {
    if (!validateSMTPAdapterConfig(config)) throw new Error('Invalid SMTP configuration.')
    if (!validateEmailMessage(message)) throw new Error('Invalid email message.')
    if (config.username !== undefined && !hasContent(secret)) {
      throw new Error('This integration does not have a usable SMTP password.')
    }

    const transport = createTransport({
      host: config.host.trim(),
      port: config.port,
      secure: config.secure,
      ...(config.username === undefined ? {} : { auth: { user: config.username.trim(), pass: secret as string } }),
    })
    const result = await transport.sendMail({
      from: { name: config.fromName?.trim() ?? '', address: config.fromAddress.trim() },
      to: Array.isArray(message.to) ? message.to.map((recipient) => recipient.trim()) : message.to.trim(),
      subject: message.subject.trim(),
      text: message.text,
      html: message.html,
      replyTo: message.replyTo?.trim(),
    })
    return { status: 'accepted', ...(result.messageId === undefined ? {} : { messageID: result.messageId }) }
  },
})
