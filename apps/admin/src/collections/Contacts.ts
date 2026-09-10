import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import { validateContactTagsBelongToOrganization } from '../crm/contact-tag-hooks'
import {
  maintainContactArchiveTimestamp,
  normalizeContactIdentity,
  normalizeCountryCode,
  validateCountryCode,
} from '../crm/contact-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Contacts: CollectionConfig = {
  slug: 'contacts',
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'kind', 'email', 'status', 'updatedAt'],
    listSearchableFields: ['displayName', 'email', 'phone', 'externalReference'],
    description:
      'Centralisez les personnes et les structures liées à votre association dans un répertoire partagé.',
    components: {
      views: {
        list: {
          Component: '@/admin/contacts/ContactsListView#ContactsListView',
        },
      },
    },
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [normalizeContactIdentity],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      validateContactTagsBelongToOrganization,
      maintainContactArchiveTimestamp,
    ],
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'person',
      index: true,
      options: [
        { label: 'Person', value: 'person' },
        { label: 'Organization', value: 'organization' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Indiquez si ce contact représente une personne ou une organisation.',
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
        description:
          'Archivez un contact au lieu de le supprimer si son historique doit être conservé.',
      },
    },
    {
      name: 'archivedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Renseigné automatiquement lors de l’archivage du contact.',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'contact-tags',
      hasMany: true,
      maxRows: 50,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Classez ce contact avec des catégories utiles à votre suivi.',
      },
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Nom affiché dans la plateforme et les listes.',
      },
    },
    {
      name: 'person',
      type: 'group',
      admin: {
        condition: (data) => data?.kind !== 'organization',
        description: 'Optional structured identity for person contacts.',
      },
      fields: [
        {
          name: 'firstName',
          type: 'text',
          index: true,
        },
        {
          name: 'lastName',
          type: 'text',
          index: true,
        },
      ],
    },
    {
      name: 'organizationDetails',
      type: 'group',
      admin: {
        condition: (data) => data?.kind === 'organization',
        description: 'Optional structured identity for organization contacts.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          index: true,
          admin: {
            description: 'Common or trading name when different from the CRM display label.',
          },
        },
        {
          name: 'legalName',
          type: 'text',
          index: true,
        },
        {
          name: 'registrationNumber',
          type: 'text',
          index: true,
          admin: {
            description:
              'Jurisdiction-neutral registration identifier when relevant. No country-specific validation is applied.',
          },
        },
        {
          name: 'website',
          type: 'text',
        },
      ],
    },
    {
      name: 'email',
      type: 'email',
      index: true,
      admin: {
        description: 'Primary email address for this CRM contact.',
      },
    },
    {
      name: 'phone',
      type: 'text',
      index: true,
      admin: {
        description:
          'Primary phone number. Formatting remains user-facing; provider-specific normalization comes later.',
      },
    },
    {
      name: 'address',
      type: 'group',
      admin: {
        description:
          'Optional primary postal address. The model intentionally avoids country-specific address assumptions.',
      },
      fields: [
        {
          name: 'line1',
          type: 'text',
        },
        {
          name: 'line2',
          type: 'text',
        },
        {
          name: 'postalCode',
          type: 'text',
          index: true,
        },
        {
          name: 'city',
          type: 'text',
          index: true,
        },
        {
          name: 'region',
          type: 'text',
        },
        {
          name: 'countryCode',
          type: 'text',
          maxLength: 2,
          minLength: 2,
          hooks: {
            beforeValidate: [normalizeCountryCode],
          },
          validate: validateCountryCode,
          admin: {
            description: 'ISO 3166-1 alpha-2 country code, for example FR.',
          },
        },
      ],
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Optional import/migration reference. It is deliberately not globally unique because external systems and tenants may reuse identifiers.',
      },
    },
  ],
}
