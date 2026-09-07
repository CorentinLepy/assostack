import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import { validateContactCustomFieldValue } from '../crm/custom-field-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const ContactCustomFieldValues: CollectionConfig = {
  slug: 'contact-custom-field-values',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['contact', 'field', 'updatedAt'],
    description: 'Typed tenant-scoped values connecting CRM Contacts to reusable custom-field definitions.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeChange: [assertOrganizationWriteAccess(['organization-admin', 'editor']), validateContactCustomFieldValue],
  },
  fields: [
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'contacts',
      required: true,
      index: true,
      admin: { description: 'Canonical Contact receiving this custom value. Must belong to the same organization.' },
    },
    {
      name: 'field',
      type: 'relationship',
      relationTo: 'custom-field-definitions',
      required: true,
      index: true,
      admin: { description: 'Custom-field definition controlling type and allowed values.' },
    },
    {
      name: 'textValue',
      type: 'textarea',
      admin: { description: 'Storage for short-text and long-text custom fields.' },
    },
    { name: 'numberValue', type: 'number' },
    { name: 'booleanValue', type: 'checkbox' },
    {
      name: 'dateValue',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    { name: 'singleSelectValue', type: 'text', index: true },
    {
      name: 'multiSelectValue',
      type: 'text',
      hasMany: true,
      maxRows: 100,
    },
  ],
}
