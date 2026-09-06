import type { CollectionConfig } from 'payload'

import { isPlatformAdmin } from '../access/organizations'
import { ensureFirstUserPlatformAdmin } from '../hooks/ensureFirstUserPlatformAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'platformRoles', 'updatedAt'],
  },
  hooks: {
    beforeChange: [ensureFirstUserPlatformAdmin],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'platformRoles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['user'],
      options: [
        { label: 'Platform admin', value: 'platform-admin' },
        { label: 'User', value: 'user' },
      ],
      access: {
        create: ({ req }) => isPlatformAdmin(req.user),
        update: ({ req }) => isPlatformAdmin(req.user),
      },
      admin: {
        description: 'Installation-wide privileges. Organization roles are stored on each organization membership.',
      },
    },
  ],
}
