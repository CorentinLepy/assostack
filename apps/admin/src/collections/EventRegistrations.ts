import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  assertEventRegistrationRelationshipsBelongToOrganization,
  ensureEventRegistrationUnique,
  maintainEventRegistrationAuthor,
} from '../crm/event-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const EventRegistrations: CollectionConfig = {
  slug: 'event-registrations',
  admin: {
    defaultColumns: ['status', 'event', 'contact', 'source', 'updatedAt'],
    listSearchableFields: ['externalReference'],
    description:
      'Tenant-scoped registrations linking an existing CRM Contact to an Event. One current registration record is kept per Event and Contact.',
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
      assertEventRegistrationRelationshipsBelongToOrganization,
      ensureEventRegistrationUnique,
      maintainEventRegistrationAuthor,
    ],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
      admin: {
        description: 'Event in the same organization as this registration.',
      },
    },
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'contacts',
      required: true,
      index: true,
      admin: {
        description:
          'CRM Contact registered for the event. Both person and organization Contacts are supported.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Attended', value: 'attended' },
        { label: 'No-show', value: 'no-show' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Current registration lifecycle state. Re-registration updates the existing record instead of creating duplicate identity.',
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      index: true,
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Form', value: 'form' },
        { label: 'Import', value: 'import' },
        { label: 'API', value: 'api' },
        { label: 'Integration', value: 'integration' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Provider-neutral origin metadata for this registration.',
      },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Optional external/import identifier. Do not store credentials or secrets here.',
      },
    },
    {
      name: 'note',
      type: 'textarea',
      maxLength: 2000,
      admin: {
        description: 'Optional concise staff note. Avoid unnecessary sensitive data.',
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
        description: 'Staff user that created this registration. Managed by AssoStack and immutable.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
