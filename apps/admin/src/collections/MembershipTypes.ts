import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  ensureMembershipTypeKeyUnique,
  maintainMembershipTypeArchiveTimestamp,
  normalizeMembershipTypeKey,
} from '../crm/membership-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const MembershipTypes: CollectionConfig = {
  slug: 'membership-types',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'status', 'updatedAt'],
    listSearchableFields: ['name', 'key'],
    description:
      'Tenant-scoped membership taxonomy. Memberships reference these types instead of duplicating plan/category metadata.',
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
        description: 'Human-readable membership type, for example Individual, Family or Partner.',
      },
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description:
          'Stable tenant-local machine key. It is normalized from the name when omitted and can be used by forms/integrations later.',
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
        description: 'Archive membership types instead of deleting taxonomy referenced by existing memberships.',
      },
    },
    {
      name: 'archivedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Managed automatically when the type enters or leaves the archived state.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 2000,
      admin: {
        description: 'Optional concise internal description of this membership type.',
      },
    },
  ],
}
