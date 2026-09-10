import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fr } from 'payload/i18n/fr'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { isPlatformAdmin } from './access/organizations'
import { applyAdminProductNavigation } from './admin/product-navigation'
import { Contacts } from './collections/Contacts'
import { ContactCustomFieldValues } from './collections/ContactCustomFieldValues'
import { ContactTags } from './collections/ContactTags'
import { CustomFieldDefinitions } from './collections/CustomFieldDefinitions'
import { Documents } from './collections/Documents'
import { EventRegistrations } from './collections/EventRegistrations'
import { Events } from './collections/Events'
import { FormSubmissions } from './collections/FormSubmissions'
import { Forms } from './collections/Forms'
import { Interactions } from './collections/Interactions'
import { Integrations } from './collections/Integrations'
import { Memberships } from './collections/Memberships'
import { MembershipTypes } from './collections/MembershipTypes'
import { Media } from './collections/Media'
import { Notes } from './collections/Notes'
import { Organizations } from './collections/Organizations'
import { Pages } from './collections/Pages'
import { PartnershipLevels } from './collections/PartnershipLevels'
import { Partnerships } from './collections/Partnerships'
import { Posts } from './collections/Posts'
import { PrivacyPurposes } from './collections/PrivacyPurposes'
import { PrivacyRecords } from './collections/PrivacyRecords'
import { Tasks } from './collections/Tasks'
import { Users } from './collections/Users'
import { VolunteerAssignments } from './collections/VolunteerAssignments'
import { VolunteerShifts } from './collections/VolunteerShifts'
import { WebhookEvents } from './collections/WebhookEvents'
import { contactCsvEndpoints } from './crm/contact-csv-endpoints'
import { integrationEndpoints } from './integrations/webhook-endpoint'
import { publicContentEndpoints } from './public-api/endpoints'
import { SITE_SYNC_QUEUE, siteSyncTask } from './site-rebuild/task'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const publicWebURL = process.env.PUBLIC_WEB_URL ?? 'http://localhost:4321'
const shouldPushSchema =
  process.env.NODE_ENV === 'development' && process.env.PAYLOAD_DB_PUSH !== 'false'
const shouldAutoRunJobs =
  process.env.ASSOSTACK_JOBS_AUTORUN === 'true' ||
  (process.env.NODE_ENV === 'production' && process.env.ASSOSTACK_JOBS_AUTORUN !== 'false')

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      title: 'AssoStack',
      titleSuffix: '',
    },
    theme: 'light',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      graphics: {
        Icon: '@/admin/AssoStackBrand#AssoStackIcon',
        Logo: '@/admin/AssoStackBrand#AssoStackLogo',
      },
      Nav: '@/admin/AssoStackNav#AssoStackNav',
      views: {
        dashboard: {
          Component: '@/admin/AssociationDashboardServer#AssociationDashboardServer',
        },
      },
    },
  },
  collections: applyAdminProductNavigation([
    Organizations,
    Users,
    ContactTags,
    CustomFieldDefinitions,
    PrivacyPurposes,
    MembershipTypes,
    PartnershipLevels,
    Forms,
    Contacts,
    ContactCustomFieldValues,
    Memberships,
    Events,
    EventRegistrations,
    VolunteerShifts,
    VolunteerAssignments,
    Partnerships,
    Interactions,
    Integrations,
    WebhookEvents,
    Notes,
    Tasks,
    PrivacyRecords,
    FormSubmissions,
    Documents,
    Media,
    Pages,
    Posts,
  ]),
  cors: [publicWebURL],
  csrf: [publicWebURL],
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, 'migrations'),
    pool: {
      connectionString: process.env.DATABASE_URL ?? '',
    },
    push: shouldPushSchema,
  }),
  editor: lexicalEditor(),
  endpoints: [...publicContentEndpoints, ...contactCsvEndpoints, ...integrationEndpoints],
  i18n: {
    fallbackLanguage: 'fr',
    supportedLanguages: { fr },
  },
  jobs: {
    enableConcurrencyControl: true,
    tasks: [siteSyncTask],
    autoRun: shouldAutoRunJobs
      ? [
          {
            cron: '*/5 * * * * *',
            queue: SITE_SYNC_QUEUE,
            limit: 10,
          },
        ]
      : [],
  },
  plugins: [
    multiTenantPlugin({
      collections: {
        'contact-tags': {},
        'custom-field-definitions': {},
        'contact-custom-field-values': {},
        'privacy-purposes': {},
        'privacy-records': {},
        'membership-types': {},
        'event-registrations': {},
        'volunteer-shifts': {},
        'volunteer-assignments': {},
        'partnership-levels': {},
        'form-submissions': {},
        memberships: {},
        events: {},
        forms: {},
        partnerships: {},
        contacts: {},
        interactions: {},
        integrations: {},
        'webhook-events': {},
        notes: {},
        tasks: {},
        documents: {},
        media: {},
        pages: {},
        posts: {},
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
