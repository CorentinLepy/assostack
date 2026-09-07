import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  maintainMembershipTypeArchiveTimestamp,
  normalizeMembershipTypeKey,
  validateMembershipTypeUniqueness,
} from '../association/membership-type-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const MembershipTypes: CollectionConfig = {
  slug: 'membership-types',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'status', 'updatedAt'],
    listSearchableFields: ['name', 'key'],
    description: 'Tenant-scoped reusable membership categories. Provider and payment rules belong in later adapters/modules.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [normalizeMembershipTypeKey],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      validateMembershipTypeUniqueness,
      maintainMembershipTypeArchiveTimestamp,
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'Stable tenant-local key. Normalized automatically and unique inside the organization.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'archivedAt',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', readOnly: true, description: 'Managed automatically when this type is archived.' },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 1000,
      admin: { description: 'Optional concise staff description of this membership category.' },
    },
  ],
}
