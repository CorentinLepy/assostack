import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import { assertNoteContactBelongsToOrganization, maintainNoteAuthor } from '../crm/note-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const Notes: CollectionConfig = {
  slug: 'notes',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'contact', 'pinned', 'occurredAt', 'createdBy', 'updatedAt'],
    listSearchableFields: ['subject', 'body'],
    description:
      'Staff-only CRM notes linked to a canonical Contact. Use interactions for structured calls, emails and meetings.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin', 'editor']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      assertNoteContactBelongsToOrganization,
      maintainNoteAuthor,
    ],
  },
  fields: [
    {
      name: 'subject',
      type: 'text',
      index: true,
      admin: {
        description: 'Optional short title for quickly identifying the note.',
      },
    },
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'contacts',
      required: true,
      index: true,
      admin: {
        description: 'Canonical CRM Contact this note belongs to. Must be in the same organization.',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Internal staff context. Avoid storing unnecessary sensitive information.',
      },
    },
    {
      name: 'pinned',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Pin high-value context so it can be surfaced prominently in future CRM views.',
      },
    },
    {
      name: 'occurredAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Optional date when the fact or conversation documented by this note actually occurred.',
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
        description: 'Staff user that created the note. Managed by AssoStack.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
