import type { Field, FieldHook } from 'payload'

const populatePublishedAt: FieldHook = ({ siblingData, value }) => {
  if (siblingData._status === 'published' && !value) {
    return new Date()
  }

  return value
}

export const publishedAtField: Field = {
  name: 'publishedAt',
  type: 'date',
  admin: {
    date: {
      pickerAppearance: 'dayAndTime',
    },
    position: 'sidebar',
  },
  hooks: {
    beforeChange: [populatePublishedAt],
  },
}

export const seoFields: Field = {
  name: 'meta',
  type: 'group',
  label: 'SEO',
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Optional search/social title override.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional search/social description override.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional social preview image. Public rendering is handled by the website layer.',
      },
    },
  ],
}

export const contentVersions = {
  drafts: {
    autosave: {
      interval: 1000,
    },
    schedulePublish: true,
  },
  maxPerDoc: 50,
} as const
