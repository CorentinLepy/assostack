import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  assertVolunteerShiftEventBelongsToOrganization,
  ensureVolunteerShiftKeyUnique,
  maintainVolunteerShiftAuthor,
  normalizeVolunteerShiftCapacity,
  normalizeVolunteerShiftDates,
  normalizeVolunteerShiftKey,
  preventVolunteerShiftDeleteWhenAssigned,
} from '../crm/volunteer-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const VolunteerShifts: CollectionConfig = {
  slug: 'volunteer-shifts',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'event', 'startsAt', 'endsAt', 'capacity'],
    listSearchableFields: ['name', 'key', 'externalReference'],
    description:
      'Tenant-scoped volunteer work slots attached to Events. Volunteer identity stays in CRM Contacts.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [
      normalizeVolunteerShiftKey,
      normalizeVolunteerShiftDates,
      normalizeVolunteerShiftCapacity,
    ],
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      assertVolunteerShiftEventBelongsToOrganization,
      ensureVolunteerShiftKeyUnique,
      maintainVolunteerShiftAuthor,
    ],
    beforeDelete: [preventVolunteerShiftDeleteWhenAssigned],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
      admin: {
        description: 'Parent Event in the same organization as this volunteer shift.',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Human-readable volunteer role or work slot, for example Setup or Welcome desk.',
      },
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description:
          'Stable machine key unique inside the parent Event. It is normalized from the name when omitted.',
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
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Completed', value: 'completed' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Explicit operational lifecycle for the shift.',
      },
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Required shift start timestamp. It may be outside the parent Event window for setup or cleanup.',
      },
    },
    {
      name: 'endsAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Required shift end timestamp. It must be strictly after the start timestamp.',
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
          'Optional positive integer target capacity. Automatic assignment rejection is outside this first version.',
      },
    },
    {
      name: 'locationName',
      type: 'text',
      admin: {
        description: 'Optional provider-neutral meeting point or work area inside the Event.',
      },
    },
    {
      name: 'instructions',
      type: 'textarea',
      maxLength: 4000,
      admin: {
        description: 'Optional concise staff instructions for volunteers assigned to this shift.',
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
        description: 'Staff user that created this shift. Managed by AssoStack and immutable.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
