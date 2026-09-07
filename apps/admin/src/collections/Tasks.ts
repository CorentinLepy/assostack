import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  maintainTaskLifecycle,
  validateTaskRelationships,
  validateTaskReminderWindow,
} from '../crm/task-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Tasks: CollectionConfig = {
  slug: 'tasks',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['status', 'priority', 'title', 'dueAt', 'assignee', 'updatedAt'],
    listSearchableFields: ['title', 'externalReference'],
    description:
      'Staff CRM follow-up. Tasks describe work still to do; completed communication/history belongs in Interactions.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [validateTaskReminderWindow],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      validateTaskRelationships,
      maintainTaskLifecycle,
    ],
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      index: true,
      options: [
        { label: 'Open', value: 'open' },
        { label: 'In progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'normal',
      index: true,
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Normal', value: 'normal' },
        { label: 'High', value: 'high' },
        { label: 'Urgent', value: 'urgent' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'dueAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Optional due date/time for this follow-up.',
      },
    },
    {
      name: 'remindAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description:
          'Optional reminder metadata. Delivery will be handled later by notification or automation adapters.',
      },
    },
    {
      name: 'assignee',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Optional staff assignee. Server-side validation requires staff access to the same organization.',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'details',
      type: 'richText',
      admin: {
        description: 'Optional staff-only context for completing the task. Avoid unnecessary sensitive data.',
      },
    },
    {
      name: 'contacts',
      type: 'relationship',
      relationTo: 'contacts',
      hasMany: true,
      maxRows: 20,
      index: true,
      admin: {
        description:
          'Optional CRM Contacts related to this follow-up. Every Contact must belong to the task organization.',
      },
    },
    {
      name: 'relatedInteraction',
      type: 'relationship',
      relationTo: 'interactions',
      index: true,
      admin: {
        description:
          'Optional Interaction that caused or provides context for this follow-up. It must belong to the same organization.',
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Managed automatically when status becomes completed.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'completedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Staff user who completed the task. Managed automatically.',
      },
      access: {
        create: () => false,
        update: () => false,
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
        description: 'Staff user who created the task. Managed automatically and immutable.',
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
        description: 'Optional import or external-system reference.',
      },
    },
  ],
}
