/** Shared outbound email contract; provider SDK types belong in adapters. */
export type EmailMessage = {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
}

export type EmailDeliveryResult = {
  status: 'accepted'
  messageID?: string
}

const hasContent = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const validateEmailMessage = (message: unknown): message is EmailMessage => {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return false
  const value = message as Record<string, unknown>
  const recipients = Array.isArray(value.to) ? value.to : [value.to]
  return (
    recipients.length > 0 && recipients.every(hasContent) &&
    hasContent(value.subject) &&
    (hasContent(value.text) || hasContent(value.html)) &&
    (value.text === undefined || typeof value.text === 'string') &&
    (value.html === undefined || typeof value.html === 'string') &&
    (value.replyTo === undefined || hasContent(value.replyTo))
  )
}
