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
    description: 'Suivez vos partenariats, soutiens et conventions au même endroit.',
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
        description: 'Donnez un nom clair à ce partenariat ou à cette convention.',
      },
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Identifiant technique généré automatiquement à partir du nom.',
      },
    },
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'contacts',
      required: true,
      index: true,
      admin: {
        description: 'Choisissez la personne ou la structure avec laquelle vous travaillez.',
      },
    },
    {
      name: 'primaryContact',
      type: 'relationship',
      relationTo: 'contacts',
      index: true,
      admin: {
        description: 'Personne à contacter pour le suivi de ce partenariat.',
      },
    },
    {
      name: 'level',
      type: 'relationship',
      relationTo: 'partnership-levels',
      index: true,
      admin: {
        description: 'Niveau associé à ce partenariat, si vous en utilisez.',
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
        description: 'Situation actuelle de ce partenariat.',
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
        description: 'Date de début de la convention ou de la prestation.',
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
        description: 'Date de fin, lorsqu’elle est connue.',
      },
    },
    {
      name: 'agreementReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Référence de la convention ou du contrat, si nécessaire.',
      },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Référence utilisée par un import ou une intégration.',
      },
    },
    {
      name: 'note',
      type: 'textarea',
      maxLength: 4000,
      admin: {
        description: 'Informations utiles pour le suivi par votre équipe.',
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
        description:
          'Staff user that created this partnership. Managed by AssoStack and immutable.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
