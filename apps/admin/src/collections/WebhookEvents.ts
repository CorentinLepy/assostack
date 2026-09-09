import type { CollectionConfig } from 'payload'

import { organizationRoleAccess } from '../access/organizations'

const systemManaged = {
  create: () => false,
  update: () => false,
}

export const WebhookEvents: CollectionConfig = {
  slug: 'webhook-events',
  admin: {
    useAsTitle: 'eventId',
    defaultColumns: ['integration', 'eventId', 'receivedAt'],
    description:
      'System-managed inbound webhook idempotency ledger. Records are written internally and are never created or mutated through the normal API.',
  },
  access: {
    create: () => false,
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'integration',
      type: 'relationship',
      relationTo: 'integrations',
      required: true,
      index: true,
      access: systemManaged,
    },
    {
      name: 'eventId',
      type: 'text',
      required: true,
      access: systemManaged,
    },
    {
      name: 'idempotencyKey',
      type: 'text',
      required: true,
      unique: true,
      access: systemManaged,
      admin: {
        description: 'organization:integration:eventId. Enforced unique at the database level for atomic deduplication.',
      },
    },
    {
      name: 'receivedAt',
      type: 'date',
      required: true,
      index: true,
      access: systemManaged,
    },
  ],
}
