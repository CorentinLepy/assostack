import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  ensureEventKeyUnique,
  maintainEventAuthor,
  normalizeEventCapacity,
  normalizeEventDates,
  normalizeEventKey,
  normalizeEventTimezone,
  preventEventDeleteWhenRegistered,
} from '../crm/event-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'startsAt', 'endsAt', 'timezone'],
    listSearchableFields: ['title', 'key', 'externalReference'],
    description:
      'Organisez les activités et événements de votre association, avec leurs dates et inscriptions.',
    components: {
      views: {
        list: {
          Component: '@/admin/events/EventsListView#EventsListView',
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
    beforeValidate: [
      normalizeEventKey,
      normalizeEventDates,
      normalizeEventCapacity,
      normalizeEventTimezone,
    ],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      ensureEventKeyUnique,
      maintainEventAuthor,
    ],
    beforeDelete: [preventEventDeleteWhenRegistered],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description:
          'Stable tenant-local machine key. It is normalized from the title when omitted and can later back public routes or integrations.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Completed', value: 'completed' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Explicit event lifecycle. Dates do not automatically change the status.',
      },
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Event start timestamp stored with timezone-aware PostgreSQL semantics.',
      },
    },
    {
      name: 'endsAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Optional event end timestamp. It cannot precede the start timestamp.',
      },
    },
    {
      name: 'timezone',
      type: 'text',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'IANA timezone used to interpret and present the event. Defaults from the organization settings.',
      },
    },
    {
      name: 'capacity',
      type: 'number',
      min: 1,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Optional positive integer capacity metadata. Automatic waitlist/capacity enforcement is intentionally outside this first version.',
      },
    },
    {
      name: 'location',
      type: 'group',
      admin: {
        description: 'Optional provider-neutral physical location metadata.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
        },
        {
          name: 'addressLine1',
          type: 'text',
        },
        {
          name: 'addressLine2',
          type: 'text',
        },
        {
          name: 'postalCode',
          type: 'text',
        },
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'region',
          type: 'text',
        },
        {
          name: 'country',
          type: 'text',
          admin: {
            description: 'Country name or code. No external geocoding provider is assumed.',
          },
        },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 4000,
      admin: {
        description: 'Optional concise event description for staff-side domain use.',
      },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Optional provider/import reference. It is deliberately provider-neutral.',
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
        description: 'Staff user that created this event. Managed by AssoStack and immutable.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
