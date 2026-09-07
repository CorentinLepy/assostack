import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  ensureContactTagSlugUnique,
  maintainContactTagArchiveTimestamp,
  normalizeContactTagSlug,
} from '../crm/contact-tag-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const ContactTags: CollectionConfig = {
  slug: 'contact-tags',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'status', 'updatedAt'],
    listSearchableFields: ['name', 'slug'],
    description:
      'Tenant-scoped CRM taxonomy for classifying Contacts. Tags do not create a separate person/member record.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [normalizeContactTagSlug],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      ensureContactTagSlugUnique,
      maintainContactTagArchiveTimestamp,
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'slug',
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
        description: 'Archive taxonomy entries instead of deleting tags that may still classify historical Contacts.',
      },
    },
    {
      name: 'archivedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Managed automatically when the tag enters or leaves the archived state.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 500,
      admin: {
        description: 'Optional short staff-facing explanation of how this tag should be used.',
      },
    },
  ],
}
