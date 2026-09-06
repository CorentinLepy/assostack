import type { CollectionConfig } from 'payload'

import { isPlatformAdmin, organizationRecordAccess } from '../access/organizations'
import { validateWebsiteSettings } from '../hooks/validateWebsiteSettings'

const validateHexColor = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') {
    return true
  }

  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    ? true
    : 'Use a six-digit hexadecimal color such as #161616.'
}

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
  hooks: {
    beforeChange: [validateWebsiteSettings],
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
            {
              name: 'siteTitle',
              type: 'text',
              admin: {
                description: 'Optional public brand/title override. Defaults to the organization name.',
              },
            },
            {
              name: 'tagline',
              type: 'textarea',
              admin: {
                description: 'Optional short public description displayed by compatible website themes.',
              },
            },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Optional organization-owned public logo.',
              },
            },
            {
              name: 'navigationMode',
              type: 'select',
              required: true,
              defaultValue: 'automatic',
              options: [
                { label: 'Automatic from published pages', value: 'automatic' },
                { label: 'Manual', value: 'manual' },
              ],
            },
            {
              name: 'navigation',
              type: 'array',
              maxRows: 20,
              admin: {
                condition: (_data, siblingData) => siblingData?.navigationMode === 'manual',
                description: 'Ordered primary navigation. Internal links must point to pages owned by this organization.',
              },
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'kind',
                  type: 'select',
                  required: true,
                  defaultValue: 'page',
                  options: [
                    { label: 'Page', value: 'page' },
                    { label: 'External URL', value: 'external' },
                  ],
                },
                {
                  name: 'page',
                  type: 'relationship',
                  relationTo: 'pages',
                  admin: {
                    condition: (_data, siblingData) => siblingData?.kind !== 'external',
                  },
                },
                {
                  name: 'url',
                  type: 'text',
                  admin: {
                    condition: (_data, siblingData) => siblingData?.kind === 'external',
                    description: 'Absolute http(s) URL.',
                  },
                },
                {
                  name: 'newTab',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: {
                    condition: (_data, siblingData) => siblingData?.kind === 'external',
                  },
                },
              ],
            },
            {
              name: 'theme',
              type: 'group',
              admin: {
                description: 'Constrained design tokens. Arbitrary CSS or JavaScript is intentionally not supported.',
              },
              fields: [
                {
                  name: 'primaryColor',
                  type: 'text',
                  validate: validateHexColor,
                  admin: {
                    description: 'Primary brand color. Default: #161616.',
                  },
                },
                {
                  name: 'accentColor',
                  type: 'text',
                  validate: validateHexColor,
                  admin: {
                    description: 'Accent/focus color. Default: #2563EB.',
                  },
                },
                {
                  name: 'backgroundColor',
                  type: 'text',
                  validate: validateHexColor,
                  admin: {
                    description: 'Page background. Default: #FBFBF9.',
                  },
                },
                {
                  name: 'surfaceColor',
                  type: 'text',
                  validate: validateHexColor,
                  admin: {
                    description: 'Secondary surface color. Default: #F7F7F5.',
                  },
                },
                {
                  name: 'textColor',
                  type: 'text',
                  validate: validateHexColor,
                  admin: {
                    description: 'Primary text color. Default: #161616.',
                  },
                },
                {
                  name: 'mutedColor',
                  type: 'text',
                  validate: validateHexColor,
                  admin: {
                    description: 'Muted text/border color. Default: #6B7280.',
                  },
                },
                {
                  name: 'fontFamily',
                  type: 'select',
                  defaultValue: 'system',
                  options: [
                    { label: 'System sans', value: 'system' },
                    { label: 'Humanist sans', value: 'humanist' },
                    { label: 'Serif', value: 'serif' },
                    { label: 'Monospace', value: 'mono' },
                  ],
                },
                {
                  name: 'radius',
                  type: 'select',
                  defaultValue: 'medium',
                  options: [
                    { label: 'None', value: 'none' },
                    { label: 'Small', value: 'small' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Large', value: 'large' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
