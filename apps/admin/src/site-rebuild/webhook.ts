import type { PayloadRequest } from 'payload'

export type SiteSyncAction = 'disable' | 'rebuild'

export type SiteSyncReason =
  | 'organization.created'
  | 'organization.deleted'
  | 'organization.disabled'
  | 'organization.slug-changed'
  | 'organization.updated'
  | 'page.deleted'
  | 'page.published'
  | 'page.unpublished'
  | 'page.updated'
  | 'post.deleted'
  | 'post.published'
  | 'post.unpublished'
  | 'post.updated'

export type SiteSyncRequest = {
  action: SiteSyncAction
  event: 'site.sync.requested'
  occurredAt: string
  organization: {
    slug: string
  }
  reason: SiteSyncReason
  version: 1
}

type DeliveryResult =
  | { status: 'disabled' }
  | { status: 'delivered' }
  | { status: 'failed' }

const DEFAULT_TIMEOUT_MS = 5_000
const MAX_TIMEOUT_MS = 30_000
const MIN_TIMEOUT_MS = 250

const getTimeoutMs = (): number => {
  const configured = Number(process.env.ASSOSTACK_SITE_REBUILD_TIMEOUT_MS)

  if (!Number.isFinite(configured)) {
    return DEFAULT_TIMEOUT_MS
  }

  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.round(configured)))
}

const getWebhookURL = (): URL | null => {
  const configured = process.env.ASSOSTACK_SITE_REBUILD_WEBHOOK_URL?.trim()
  if (!configured) {
    return null
  }

  try {
    const url = new URL(configured)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export const isSiteSyncConfigured = (): boolean => getWebhookURL() !== null

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown site sync delivery error'

export const deliverSiteSyncRequest = async ({
  action,
  now = () => new Date(),
  organizationSlug,
  reason,
  req,
}: {
  action: SiteSyncAction
  now?: () => Date
  organizationSlug: string
  reason: SiteSyncReason
  req: Pick<PayloadRequest, 'payload'>
}): Promise<DeliveryResult> => {
  const webhookURL = getWebhookURL()
  if (!webhookURL) {
    return { status: 'disabled' }
  }

  const payload: SiteSyncRequest = {
    action,
    event: 'site.sync.requested',
    occurredAt: now().toISOString(),
    organization: {
      slug: organizationSlug,
    },
    reason,
    version: 1,
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    'User-Agent': 'AssoStack-Site-Sync/1',
  })
  const token = process.env.ASSOSTACK_SITE_REBUILD_WEBHOOK_TOKEN?.trim()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  try {
    const response = await fetch(webhookURL, {
      body: JSON.stringify(payload),
      headers,
      method: 'POST',
      signal: AbortSignal.timeout(getTimeoutMs()),
    })

    if (!response.ok) {
      throw new Error(`Site sync webhook returned HTTP ${response.status}.`)
    }

    return { status: 'delivered' }
  } catch (error) {
    req.payload.logger.warn({
      err: errorMessage(error),
      msg: 'Site sync webhook delivery failed.',
      organization: organizationSlug,
      reason,
    })

    return { status: 'failed' }
  }
}
