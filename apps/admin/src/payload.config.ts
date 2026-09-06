import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { isPlatformAdmin } from './access/organizations'
import { Contacts } from './collections/Contacts'
import { Organizations } from './collections/Organizations'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const publicWebURL = process.env.PUBLIC_WEB_URL ?? 'http://localhost:4321'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Organizations, Users, Contacts],
  cors: [publicWebURL],
  csrf: [publicWebURL],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL ?? '',
    },
    push: process.env.NODE_ENV !== 'production',
  }),
  editor: lexicalEditor(),
  plugins: [
    multiTenantPlugin({
      collections: {
        contacts: {},
      },
      tenantField: {
        name: 'organization',
      },
      tenantsArrayField: {
        includeDefaultField: true,
        arrayFieldName: 'organizations',
        arrayTenantFieldName: 'organization',
        arrayFieldAccess: {
          create: ({ req }) => isPlatformAdmin(req.user),
          update: ({ req }) => isPlatformAdmin(req.user),
        },
        tenantFieldAccess: {
          create: ({ req }) => isPlatformAdmin(req.user),
          update: ({ req }) => isPlatformAdmin(req.user),
        },
        rowFields: [
          {
            name: 'roles',
            type: 'select',
            hasMany: true,
            required: true,
            defaultValue: ['member'],
            options: [
              { label: 'Organization admin', value: 'organization-admin' },
              { label: 'Editor', value: 'editor' },
              { label: 'Member', value: 'member' },
            ],
            access: {
              create: ({ req }) => isPlatformAdmin(req.user),
              update: ({ req }) => isPlatformAdmin(req.user),
            },
          },
        ],
      },
      tenantsSlug: Organizations.slug,
      userHasAccessToAllTenants: (user) => isPlatformAdmin(user),
    }),
  ],
  secret: process.env.PAYLOAD_SECRET ?? '',
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
