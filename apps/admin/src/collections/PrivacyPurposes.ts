import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  ensurePrivacyPurposeKeyUnique,
  maintainPrivacyPurposeArchiveTimestamp,
  normalizePrivacyPurposeKey,
} from '../crm/privacy-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const PrivacyPurposes: CollectionConfig = {
  slug: 'privacy-purposes',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'legalBasis', 'status', 'updatedAt'],
    listSearchableFields: ['name', 'key'],
    description:
      'Tenant-scoped privacy purposes. They describe why data is processed; decision history is stored separately in Privacy Records.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [normalizePrivacyPurposeKey],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      ensurePrivacyPurposeKeyUnique,
      maintainPrivacyPurposeArchiveTimestamp,
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Human-readable purpose, for example Newsletter or Membership administration.',
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
      name: 'legalBasis',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Consent', value: 'consent' },
        { label: 'Contract', value: 'contract' },
        { label: 'Legal obligation', value: 'legal-obligation' },
        { label: 'Vital interests', value: 'vital-interests' },
        { label: 'Public task', value: 'public-task' },
        { label: 'Legitimate interests', value: 'legitimate-interests' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description:
          'Operational metadata only. AssoStack does not decide which legal basis is appropriate for an organization.',
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
        description: 'Archive purposes instead of deleting history that existing Privacy Records reference.',
      },
    },
    {
      name: 'archivedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Managed automatically when the purpose enters or leaves the archived state.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional concise internal description of the processing purpose.',
      },
    },
  ],
}
