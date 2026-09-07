import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import { validateFormSubmission } from '../association/form-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const FormSubmissions: CollectionConfig = {
  slug: 'form-submissions',
  admin: {
    defaultColumns: ['status', 'form', 'contact', 'source', 'submittedAt'],
    description: 'Tenant-scoped immutable form response payloads with staff review lifecycle metadata.',
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
      validateFormSubmission,
    ],
  },
  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
      index: true,
      admin: { description: 'Form in the same organization. Immutable after creation.' },
    },
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'contacts',
      index: true,
      admin: { description: 'Optional canonical CRM Contact in the same organization. Immutable after creation.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'received',
      index: true,
      options: [
        { label: 'Received', value: 'received' },
        { label: 'Reviewing', value: 'reviewing' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      index: true,
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Public form', value: 'public-form' },
        { label: 'Import', value: 'import' },
        { label: 'API', value: 'api' },
        { label: 'Integration', value: 'integration' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Provider-neutral origin metadata. Immutable after creation.',
      },
    },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Authenticated staff creator when applicable. Immutable.',
      },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'values',
      type: 'array',
      maxRows: 100,
      admin: {
        description: 'Typed response values. Field label/type are snapshotted from the Form and immutable after creation.',
      },
      fields: [
        { name: 'fieldKey', type: 'text', required: true },
        { name: 'fieldLabel', type: 'text', required: true },
        {
          name: 'fieldType',
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
        { name: 'textValue', type: 'textarea' },
        { name: 'numberValue', type: 'number' },
        { name: 'booleanValue', type: 'checkbox' },
        { name: 'dateValue', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
        { name: 'singleSelectValue', type: 'text' },
        { name: 'multiSelectValue', type: 'text', hasMany: true, maxRows: 100 },
      ],
    },
  ],
}
