import type { CollectionConfig } from 'payload'

import { isPlatformAdmin, organizationRecordAccess } from '../access/organizations'

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'status', 'updatedAt'],
  },
  access: {
    create: ({ req }) => isPlatformAdmin(req.user),
    read: ({ req }) => Boolean(req.user),
    update: organizationRecordAccess(['organization-admin']),
    delete: ({ req }) => isPlatformAdmin(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: {
        update: ({ req }) => isPlatformAdmin(req.user),
      },
      admin: {
        description: 'Stable installation-level identifier. Only platform administrators can change it.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      access: {
        update: ({ req }) => isPlatformAdmin(req.user),
      },
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: {
        description: 'Tenant lifecycle status managed by the platform.',
      },
    },
    {
      name: 'settings',
      type: 'group',
      admin: {
        description: 'Organization-managed defaults used by AssoStack modules and the public website.',
      },
      fields: [
        {
          name: 'locale',
          type: 'text',
          required: true,
          defaultValue: 'en',
          admin: {
            description: 'BCP 47 locale identifier, for example fr-FR or en-GB.',
          },
        },
        {
          name: 'timezone',
          type: 'text',
          required: true,
          defaultValue: 'UTC',
          admin: {
            description: 'IANA timezone identifier, for example Europe/Paris.',
          },
        },
        {
          name: 'publicContact',
          type: 'group',
          fields: [
            {
              name: 'email',
              type: 'email',
            },
            {
              name: 'phone',
              type: 'text',
            },
          ],
        },
        {
          name: 'website',
          type: 'group',
          fields: [
            {
              name: 'enabled',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'primaryDomain',
              type: 'text',
              admin: {
                description: 'Primary hostname for the public website, without organization-specific assumptions.',
              },
            },
          ],
        },
      ],
    },
  ],
}
