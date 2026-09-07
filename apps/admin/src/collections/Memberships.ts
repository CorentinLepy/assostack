import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  maintainMembershipAttribution,
  validateMembershipDates,
  validateMembershipNumberUniqueness,
  validateMembershipRelationships,
} from '../association/membership-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Memberships: CollectionConfig = {
  slug: 'memberships',
  admin: {
    useAsTitle: 'membershipNumber',
    defaultColumns: ['membershipNumber', 'contact', 'membershipType', 'status', 'startsAt', 'endsAt'],
    listSearchableFields: ['membershipNumber', 'externalReference'],
    description: 'Association membership history linked to CRM Contacts. Identity is never duplicated here.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [validateMembershipDates],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      validateMembershipRelationships,
      validateMembershipNumberUniqueness,
      maintainMembershipAttribution,
    ],
  },
  fields: [
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'contacts',
      required: true,
      index: true,
      admin: { description: 'Existing person or organization Contact that owns this membership.' },
    },
    {
      name: 'membershipType',
      type: 'relationship',
      relationTo: 'membership-types',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Ended', value: 'ended' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'endsAt',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'membershipNumber',
      type: 'text',
      index: true,
      admin: { position: 'sidebar', description: 'Optional tenant-local membership number. Unique when present.' },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: { position: 'sidebar', description: 'Optional import or external-system reference.' },
    },
    {
      name: 'note',
      type: 'textarea',
      maxLength: 2000,
      admin: { description: 'Optional concise staff note. Avoid unnecessary sensitive data.' },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { position: 'sidebar', readOnly: true, description: 'Staff user who created this membership. Immutable.' },
      access: { create: () => false, update: () => false },
    },
  ],
}
