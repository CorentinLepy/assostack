import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  assertInteractionContactsBelongToOrganization,
  maintainInteractionAuthor,
} from '../crm/interaction-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Interactions: CollectionConfig = {
  slug: 'interactions',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['occurredAt', 'kind', 'subject', 'contacts', 'createdBy'],
    listSearchableFields: ['subject', 'externalReference'],
    description:
      'Staff-only CRM timeline entries linked to one or more Contacts. Association-specific roles remain separate modules.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      assertInteractionContactsBelongToOrganization,
      maintainInteractionAuthor,
    ],
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'note',
      index: true,
      options: [
        { label: 'Note', value: 'note' },
        { label: 'Email', value: 'email' },
        { label: 'Phone call', value: 'phone-call' },
        { label: 'Meeting', value: 'meeting' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'direction',
      type: 'select',
      index: true,
      options: [
        { label: 'Internal', value: 'internal' },
        { label: 'Inbound', value: 'inbound' },
        { label: 'Outbound', value: 'outbound' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Optional communication direction. Notes and meetings may leave this empty.',
      },
    },
    {
      name: 'occurredAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When the interaction actually happened; may differ from when it was entered into AssoStack.',
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'contacts',
      type: 'relationship',
      relationTo: 'contacts',
      hasMany: true,
      required: true,
      minRows: 1,
      maxRows: 20,
      index: true,
      admin: {
        description: 'Every related Contact must belong to the same organization as this timeline entry.',
      },
    },
    {
      name: 'details',
      type: 'richText',
      admin: {
        description: 'Optional staff-only interaction details. Do not store unnecessary sensitive data.',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Staff user that created the CRM entry. Managed by AssoStack.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Optional reference used by imports or future external-system adapters.',
      },
    },
  ],
}
