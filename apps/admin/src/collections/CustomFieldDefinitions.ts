import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  maintainCustomFieldArchiveTimestamp,
  normalizeCustomFieldDefinitionKey,
  normalizeCustomFieldSortOrder,
  preventCustomFieldDefinitionDeleteWhenReferenced,
  validateCustomFieldDefinition,
} from '../crm/custom-field-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const CustomFieldDefinitions: CollectionConfig = {
  slug: 'custom-field-definitions',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'key', 'type', 'status', 'sortOrder', 'updatedAt'],
    listSearchableFields: ['label', 'key'],
    description: 'Tenant-scoped CRM custom-field schema for Contacts. Definitions are controlled by organization admins.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user, ['organization-admin']),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [normalizeCustomFieldDefinitionKey, normalizeCustomFieldSortOrder],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin']),
      validateCustomFieldDefinition,
      maintainCustomFieldArchiveTimestamp,
    ],
    beforeDelete: [preventCustomFieldDefinitionDeleteWhenReferenced],
  },
  fields: [
    { name: 'label', type: 'text', required: true, index: true },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      unique: false,
      admin: { description: 'Stable identifier unique inside one organization.' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Short text', value: 'short-text' },
        { label: 'Long text', value: 'long-text' },
        { label: 'Number', value: 'number' },
        { label: 'Boolean', value: 'boolean' },
        { label: 'Date', value: 'date' },
        { label: 'Single select', value: 'single-select' },
        { label: 'Multi select', value: 'multi-select' },
      ],
      admin: { description: 'Type becomes immutable once Contact values exist.' },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 500,
      admin: { description: 'Optional staff-facing help text.' },
    },
    {
      name: 'required',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Metadata for future forms/import validation; does not make every existing Contact invalid.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      min: 0,
      defaultValue: 0,
      index: true,
      admin: { position: 'sidebar', description: 'Non-negative whole number for deterministic display ordering.' },
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
      admin: { position: 'sidebar', description: 'Archive definitions to retain historical Contact values.' },
    },
    {
      name: 'archivedAt',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'options',
      type: 'array',
      maxRows: 100,
      admin: { description: 'Only used by single-select and multi-select definitions.' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    },
  ],
}
