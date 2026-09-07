import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  ensurePartnershipLevelKeyUnique,
  maintainPartnershipLevelArchiveTimestamp,
  normalizePartnershipLevelKey,
  normalizePartnershipLevelSortOrder,
  preventPartnershipLevelDeleteWhenReferenced,
} from '../crm/partnership-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const PartnershipLevels: CollectionConfig = {
  slug: 'partnership-levels',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'status', 'sortOrder', 'updatedAt'],
    listSearchableFields: ['name', 'key'],
    description:
      'Tenant-scoped partnership tiers such as Main partner, Gold or Supporter. Partnerships reference this taxonomy instead of copying tier labels.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [
      normalizePartnershipLevelKey,
      normalizePartnershipLevelSortOrder,
    ],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      ensurePartnershipLevelKeyUnique,
      maintainPartnershipLevelArchiveTimestamp,
    ],
    beforeDelete: [preventPartnershipLevelDeleteWhenReferenced],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description:
          'Stable tenant-local machine key. It is normalized from the level name when omitted.',
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
        description: 'Archive old tiers instead of deleting taxonomy referenced by partnership history.',
      },
    },
    {
      name: 'archivedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Managed automatically when the level enters or leaves the archived state.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      min: 0,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Optional non-negative whole number for deterministic tier ordering.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 2000,
      admin: {
        description: 'Optional concise internal description of this partnership tier.',
      },
    },
  ],
}
