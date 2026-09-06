import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import { pageBlocks } from '../cms/blocks'
import { contentVersions, publishedAtField, seoFields } from '../cms/fields'
import { tenantSlugField } from '../cms/slug'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'
import {
  createPublicContentSiteSyncAfterChange,
  createPublicContentSiteSyncAfterDelete,
} from '../site-rebuild/hooks'

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
    afterChange: [createPublicContentSiteSyncAfterChange('page')],
    afterDelete: [createPublicContentSiteSyncAfterDelete('page')],
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
      name: 'sections',
      type: 'blocks',
      blocks: pageBlocks,
      maxRows: 20,
      admin: {
        description:
          'Optional structured page sections. When present, the public website renders these instead of the simple rich-text body.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      admin: {
        description:
          'Simple rich-text body and backwards-compatible fallback when no structured sections are configured.',
      },
    },
    seoFields,
    publishedAtField,
  ],
  versions: contentVersions,
}
