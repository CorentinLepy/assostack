import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import { contentVersions, publishedAtField, seoFields } from '../cms/fields'
import { tenantSlugField } from '../cms/slug'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'publishedAt', 'updatedAt'],
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeChange: [assertOrganizationWriteAccess(['organization-admin', 'editor'])],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    tenantSlugField(),
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description: 'Optional short summary for navigation, cards, and search results.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    seoFields,
    publishedAtField,
  ],
  versions: contentVersions,
}
