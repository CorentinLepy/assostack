import path from 'path'
import type { CollectionConfig } from 'payload'
import { fileURLToPath } from 'url'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  assertDocumentContactBelongsToOrganization,
  maintainDocumentAuthor,
} from '../association/document-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'contact', 'createdBy', 'updatedAt'],
    listSearchableFields: ['title', 'description', 'category'],
    description:
      'Conservez les documents internes de votre association, séparés des médias publiés sur le site.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      assertDocumentContactBelongsToOrganization,
      maintainDocumentAuthor,
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Internal description or context for staff.',
      },
    },
    {
      name: 'category',
      type: 'text',
      index: true,
      admin: {
        description:
          'Free-form reusable category. Tenant-configurable taxonomies can be added later without changing storage.',
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
      },
    },
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'contacts',
      index: true,
      admin: {
        description: 'Optional canonical CRM Contact. Must belong to the same organization.',
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
        description: 'Staff user that created the document record. Managed by AssoStack.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../documents'),
    mimeTypes: [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/*',
    ],
  },
}
