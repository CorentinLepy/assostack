import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'
import {
  assertMembershipRelationshipsBelongToOrganization,
  ensureMembershipNumberUnique,
  maintainMembershipAuthor,
  normalizeMembershipNumber,
  validateMembershipDates,
} from '../memberships/membership-hooks'

export const Memberships: CollectionConfig = {
  slug: 'memberships',
  admin: {
    useAsTitle: 'membershipNumber',
    defaultColumns: ['membershipNumber', 'contact', 'membershipType', 'status', 'startsAt', 'endsAt'],
    listSearchableFields: ['membershipNumber', 'externalReference'],
    description:
      'Tenant-scoped membership lifecycle. A membership references an existing Contact instead of duplicating person or organization identity.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [normalizeMembershipNumber],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      assertMembershipRelationshipsBelongToOrganization,
      validateMembershipDates,
      ensureMembershipNumberUnique,
      maintainMembershipAuthor,
    ],
  },
  fields: [
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'contacts',
      required: true,
      index: true,
      admin: {
        description:
          'The existing CRM Contact that holds this membership. Person and organization Contacts are both supported.',
      },
    },
    {
      name: 'membershipType',
      type: 'relationship',
      relationTo: 'membership-types',
      required: true,
      index: true,
      admin: {
        description: 'Tenant-local membership category for this membership period.',
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
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Ended', value: 'ended' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Explicit lifecycle state. AssoStack does not automatically change status from dates in this first version.',
      },
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'Start of the membership period.',
      },
    },
    {
      name: 'endsAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'Optional end of the membership period. It cannot precede the start date.',
      },
    },
    {
      name: 'membershipNumber',
      type: 'text',
      index: true,
      unique: false,
      admin: {
        position: 'sidebar',
        description:
          'Optional tenant-local membership identifier. Empty values are stored as null; non-empty values must be unique inside the organization.',
      },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Optional import or external-system reference. It is deliberately not globally unique or provider-specific.',
      },
    },
    {
      name: 'note',
      type: 'textarea',
      maxLength: 2000,
      admin: {
        description: 'Optional concise staff note. Avoid duplicating personal data already stored on Contact.',
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
        description: 'Staff user that created this membership. Managed by AssoStack.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
