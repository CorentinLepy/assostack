import type { Block, Field } from 'payload'

import { builtInPublicRouteOptions } from './public-routes'
import {
  ensureMediaBelongsToCurrentOrganization,
  ensurePageBelongsToCurrentOrganization,
} from './relationships'

const validateExternalURL = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') {
    return true
  }

  if (typeof value !== 'string') {
    return 'Use an absolute http(s) URL.'
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? true
      : 'Use an absolute http(s) URL.'
  } catch {
    return 'Use an absolute http(s) URL.'
  }
}

const actionField = (name = 'action', label = 'Action'): Field => ({
  name,
  type: 'group',
  label,
  fields: [
    {
      name: 'label',
      type: 'text',
      admin: {
        description: 'Leave empty to hide the action.',
      },
    },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'page',
      options: [
        { label: 'Internal page', value: 'page' },
        { label: 'Built-in route', value: 'route' },
        { label: 'External URL', value: 'external' },
      ],
    },
    {
      name: 'page',
      type: 'relationship',
      relationTo: 'pages',
      hooks: {
        beforeChange: [ensurePageBelongsToCurrentOrganization],
      },
      admin: {
        condition: (_data, siblingData) => siblingData?.kind === 'page',
      },
    },
    {
      name: 'route',
      type: 'select',
      options: builtInPublicRouteOptions.map(({ label: routeLabel, value }) => ({
        label: routeLabel,
        value,
      })),
      admin: {
        condition: (_data, siblingData) => siblingData?.kind === 'route',
        description: 'Built-in AssoStack public destination.',
      },
    },
    {
      name: 'url',
      type: 'text',
      validate: validateExternalURL,
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
})

export const heroBlock: Block = {
  slug: 'hero',
  labels: {
    singular: 'Hero',
    plural: 'Heroes',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
    },
    {
      name: 'heading',
      type: 'text',
      required: true,
    },
    {
      name: 'text',
      type: 'textarea',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      hooks: {
        beforeChange: [ensureMediaBelongsToCurrentOrganization],
      },
    },
    {
      name: 'alignment',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    actionField(),
  ],
}

export const richTextBlock: Block = {
  slug: 'richText',
  labels: {
    singular: 'Rich text',
    plural: 'Rich text sections',
  },
  fields: [
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
  ],
}

export const calloutBlock: Block = {
  slug: 'callout',
  labels: {
    singular: 'Callout',
    plural: 'Callouts',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
    },
    {
      name: 'text',
      type: 'textarea',
    },
    {
      name: 'tone',
      type: 'select',
      defaultValue: 'neutral',
      options: [
        { label: 'Neutral', value: 'neutral' },
        { label: 'Accent', value: 'accent' },
      ],
    },
    actionField(),
  ],
}

export const cardsBlock: Block = {
  slug: 'cards',
  labels: {
    singular: 'Cards',
    plural: 'Card sections',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
    },
    {
      name: 'intro',
      type: 'textarea',
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 6,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          hooks: {
            beforeChange: [ensureMediaBelongsToCurrentOrganization],
          },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'text',
          type: 'textarea',
        },
        actionField(),
      ],
    },
  ],
}

export const pageBlocks: Block[] = [heroBlock, richTextBlock, calloutBlock, cardsBlock]
