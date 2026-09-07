import type { TaskConfig } from 'payload'

import {
  deliverSiteSyncRequest,
  type SiteSyncAction,
  type SiteSyncReason,
} from './webhook'

export const SITE_SYNC_QUEUE = 'site-sync'
export const SITE_SYNC_TASK = 'siteSync'

type SiteSyncTaskDefinition = {
  input: {
    action: SiteSyncAction
    occurredAt: string
    organizationSlug: string
    reason: SiteSyncReason
  }
  output: {
    delivered: boolean
  }
}

const reasonOptions: Array<{ label: string; value: SiteSyncReason }> = [
  { label: 'Organization deleted', value: 'organization.deleted' },
  { label: 'Organization disabled', value: 'organization.disabled' },
  { label: 'Organization slug changed', value: 'organization.slug-changed' },
  { label: 'Organization updated', value: 'organization.updated' },
  { label: 'Page deleted', value: 'page.deleted' },
  { label: 'Page published', value: 'page.published' },
  { label: 'Page unpublished', value: 'page.unpublished' },
  { label: 'Page updated', value: 'page.updated' },
  { label: 'Post deleted', value: 'post.deleted' },
  { label: 'Post published', value: 'post.published' },
  { label: 'Post unpublished', value: 'post.unpublished' },
  { label: 'Post updated', value: 'post.updated' },
]

export const siteSyncTask: TaskConfig<SiteSyncTaskDefinition> = {
  slug: SITE_SYNC_TASK,
  label: 'Synchronize public static site',
  retries: {
    attempts: 3,
    backoff: {
      delay: 1_000,
      type: 'exponential',
    },
  },
  concurrency: {
    exclusive: true,
    key: ({ input }) => `site-sync:${input.organizationSlug}`,
    supersedes: true,
  },
  inputSchema: [
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Rebuild', value: 'rebuild' },
        { label: 'Disable', value: 'disable' },
      ],
    },
    {
      name: 'organizationSlug',
      type: 'text',
      required: true,
    },
    {
      name: 'reason',
      type: 'select',
      required: true,
      options: reasonOptions,
    },
    {
      name: 'occurredAt',
      type: 'date',
      required: true,
    },
  ],
  outputSchema: [
    {
      name: 'delivered',
      type: 'checkbox',
      required: true,
    },
  ],
  handler: async ({ input, req }) => {
    const result = await deliverSiteSyncRequest({
      action: input.action,
      now: () => new Date(input.occurredAt),
      organizationSlug: input.organizationSlug,
      reason: input.reason,
      req,
    })

    if (result.status === 'failed') {
      throw new Error('Static-site synchronization delivery failed.')
    }

    return {
      output: {
        delivered: result.status === 'delivered',
      },
    }
  },
}
