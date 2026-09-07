import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'
import {
  ensureMembershipTypeKeyUnique,
  maintainMembershipTypeArchiveTimestamp,
  normalizeMembershipTypeKey,
} from '../memberships/membership-hooks'

export const MembershipTypes: CollectionConfig = {
  slug: 'membership-types',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'status', 'updatedAt'],
    listSearchableFields: ['name', 'key'],
    description:
      'Tenant-scoped membership taxonomy. Memberships reference these types without duplicating Contact identity.',
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
      ensureMembershipTypeKeyUnique,
      maintainMembershipTypeArchiveTimestamp,
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Human-readable type, for example Standard, Student or Corporate.',
      },
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      unique: false,
      admin: {
        description:
          'Normalized stable identifier. It is unique inside one organization, not globally across AssoStack.',
      },
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
      admin: {
        position: 'sidebar',
        description:
          'Archive membership types instead of deleting taxonomy entries referenced by historical memberships.',
      },
    },
    {
      name: 'archivedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Managed automatically when the membership type enters or leaves the archived state.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 1000,
      admin: {
        description: 'Optional concise staff-facing explanation of this membership type.',
      },
    },
  ],
}
