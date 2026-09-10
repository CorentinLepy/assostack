import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  assertMembershipRelationshipsBelongToOrganization,
  ensureMembershipNumberUnique,
  maintainMembershipAuthor,
  normalizeMembershipDates,
  normalizeMembershipNumber,
} from '../crm/membership-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Memberships: CollectionConfig = {
  slug: 'memberships',
  admin: {
    useAsTitle: 'membershipNumber',
    defaultColumns: [
      'status',
      'membershipNumber',
      'contact',
      'membershipType',
      'startsAt',
      'endsAt',
    ],
    listSearchableFields: ['membershipNumber', 'externalReference'],
    description:
      'Suivez les adhésions, leur période de validité et les types proposés par votre association.',
    components: {
      views: {
        list: {
          Component: '@/admin/memberships/MembershipsListView#MembershipsListView',
        },
      },
    },
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [normalizeMembershipNumber, normalizeMembershipDates],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      assertMembershipRelationshipsBelongToOrganization,
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
          'The CRM Contact that holds this membership. Both person and organization Contacts are supported.',
      },
    },
    {
      name: 'membershipType',
      type: 'relationship',
      relationTo: 'membership-types',
      required: true,
      index: true,
      admin: {
        description: 'Tenant-local membership type for this lifecycle record.',
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
          'Operational lifecycle state. Dates do not automatically change status in this first version.',
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
        description: 'Required membership start date.',
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
        description: 'Optional membership end date. It cannot precede the start date.',
      },
    },
    {
      name: 'membershipNumber',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Optional tenant-local membership identifier. Leading/trailing whitespace is removed and non-empty values are unique per organization.',
      },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Optional provider/import reference. It is intentionally provider-neutral and is not treated as a secret.',
      },
    },
    {
      name: 'note',
      type: 'textarea',
      maxLength: 2000,
      admin: {
        description: 'Optional concise staff note. Avoid storing unnecessary sensitive data.',
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
        description: 'Staff user that created this membership. Managed by AssoStack and immutable.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
