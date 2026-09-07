import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  ensureFormKeyUnique,
  normalizeFormDefinition,
  preventFormDeleteWhenSubmitted,
  preventFormSchemaChangeWhenSubmitted,
} from '../association/form-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Forms: CollectionConfig = {
  slug: 'forms',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'key', 'status', 'updatedAt'],
    listSearchableFields: ['title', 'key'],
    description: 'Tenant-scoped reusable form schemas for association workflows.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [normalizeFormDefinition],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      ensureFormKeyUnique,
      preventFormSchemaChangeWhenSubmitted,
    ],
    beforeDelete: [preventFormDeleteWhenSubmitted],
  },
  fields: [
    { name: 'title', type: 'text', required: true, index: true },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      unique: false,
      admin: { description: 'Stable identifier unique inside one organization.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Only active forms can receive new submissions.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 2000,
    },
    {
      name: 'fields',
      type: 'array',
      maxRows: 100,
      admin: {
        description: 'Ordered schema. Once submissions exist, archive this form and create a new version instead of changing fields.',
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'key',
          type: 'text',
          required: true,
          admin: { description: 'Stable key unique within this Form.' },
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Short text', value: 'short-text' },
            { label: 'Long text', value: 'long-text' },
            { label: 'Email', value: 'email' },
            { label: 'Number', value: 'number' },
            { label: 'Boolean', value: 'boolean' },
            { label: 'Date', value: 'date' },
            { label: 'Single select', value: 'single-select' },
            { label: 'Multi select', value: 'multi-select' },
          ],
        },
        { name: 'required', type: 'checkbox', defaultValue: false },
        {
          name: 'options',
          type: 'array',
          maxRows: 100,
          admin: { description: 'Only valid for single-select and multi-select fields.' },
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'value', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
}
