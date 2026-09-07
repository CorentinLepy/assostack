import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  assertPartnershipRelationshipsBelongToOrganization,
  ensurePartnershipKeyUnique,
  maintainPartnershipAuthor,
  normalizePartnershipDates,
  normalizePartnershipKey,
} from '../crm/partnership-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Partnerships: CollectionConfig = {
  slug: 'partnerships',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'status', 'partner', 'level', 'startsAt', 'endsAt'],
    listSearchableFields: ['name', 'key', 'agreementReference', 'externalReference'],
    description:
      'Tenant-scoped sponsorship and partnership lifecycle. Partner identity stays in CRM Contacts.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [normalizePartnershipKey, normalizePartnershipDates],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      assertPartnershipRelationshipsBelongToOrganization,
      ensurePartnershipKeyUnique,
      maintainPartnershipAuthor,
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description:
          'Human-readable partnership record, for example Acme - 2027 season. Separate records may represent different seasons or agreements.',
      },
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Stable tenant-local machine key normalized from the name when omitted.',
      },
    },
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'contacts',
      required: true,
      index: true,
      admin: {
        description:
          'Canonical CRM Contact for the partner. Organization Contacts are typical, but individual partners are supported by the generic core.',
      },
    },
    {
      name: 'primaryContact',
      type: 'relationship',
      relationTo: 'contacts',
      index: true,
      admin: {
        description:
          'Optional same-tenant CRM Contact used as the operational interlocutor. Identity is never duplicated here.',
      },
    },
    {
      name: 'level',
      type: 'relationship',
      relationTo: 'partnership-levels',
      index: true,
      admin: {
        description: 'Optional tenant-local partnership tier.',
      },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'partner',
      index: true,
      options: [
        { label: 'Sponsor', value: 'sponsor' },
        { label: 'Partner', value: 'partner' },
        { label: 'Supplier', value: 'supplier' },
        { label: 'Institutional', value: 'institutional' },
        { label: 'Media', value: 'media' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'prospect',
      index: true,
      options: [
        { label: 'Prospect', value: 'prospect' },
        { label: 'Negotiating', value: 'negotiating' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Ended', value: 'ended' },
        { label: 'Declined', value: 'declined' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Current operational partnership lifecycle state.',
      },
    },
    {
      name: 'startsAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'Optional agreement/service start date.',
      },
    },
    {
      name: 'endsAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'Optional end date. It cannot precede the start date when both are present.',
      },
    },
    {
      name: 'agreementReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Optional internal/provider-neutral agreement or contract reference.',
      },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Optional import/integration reference. Never store credentials or secrets here.',
      },
    },
    {
      name: 'note',
      type: 'textarea',
      maxLength: 4000,
      admin: {
        description: 'Optional concise staff note. Avoid unnecessary sensitive data.',
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
        description: 'Staff user that created this partnership. Managed by AssoStack and immutable.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
