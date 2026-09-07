import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  assertVolunteerAssignmentRelationshipsBelongToOrganization,
  ensureVolunteerAssignmentUnique,
  maintainVolunteerAssignmentAuthor,
} from '../crm/volunteer-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const VolunteerAssignments: CollectionConfig = {
  slug: 'volunteer-assignments',
  admin: {
    defaultColumns: ['status', 'shift', 'contact', 'source', 'updatedAt'],
    listSearchableFields: ['externalReference'],
    description:
      'Tenant-scoped assignment of a CRM Contact to a volunteer shift. No duplicate volunteer identity is created.',
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
      assertVolunteerAssignmentRelationshipsBelongToOrganization,
      ensureVolunteerAssignmentUnique,
      maintainVolunteerAssignmentAuthor,
    ],
  },
  fields: [
    {
      name: 'shift',
      type: 'relationship',
      relationTo: 'volunteer-shifts',
      required: true,
      index: true,
      admin: {
        description: 'Volunteer Shift in the same organization as this assignment.',
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
          'CRM Contact assigned to the shift. Both person and organization Contacts are supported by the generic core.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'invited',
      index: true,
      options: [
        { label: 'Invited', value: 'invited' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Completed', value: 'completed' },
        { label: 'No-show', value: 'no-show' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Current assignment lifecycle. Re-assignment updates the existing Shift + Contact record.',
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
        description: 'Provider-neutral origin metadata for this assignment.',
      },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Optional external/import identifier. Never store credentials or secrets here.',
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
        description: 'Staff user that created this assignment. Managed by AssoStack and immutable.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
