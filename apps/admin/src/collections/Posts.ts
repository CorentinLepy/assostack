import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import { contentVersions, publishedAtField, seoFields } from '../cms/fields'
import { ensureMediaBelongsToCurrentOrganization } from '../cms/relationships'
import { tenantSlugField } from '../cms/slug'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Posts: CollectionConfig = {
  slug: 'posts',
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
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Optional short introduction used by lists and cards.',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      hooks: {
        beforeChange: [ensureMediaBelongsToCurrentOrganization],
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
