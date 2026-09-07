import type { CollectionConfig } from 'payload'

import { canManageAnyOrganization, organizationRoleAccess } from '../access/organizations'
import {
  assertPrivacyRecordRelationshipsBelongToOrganization,
  maintainPrivacyRecordAuthor,
  normalizePrivacyRecordDates,
} from '../crm/privacy-hooks'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'

export const PrivacyRecords: CollectionConfig = {
  slug: 'privacy-records',
  admin: {
    useAsTitle: 'eventType',
    defaultColumns: ['effectiveAt', 'eventType', 'contact', 'purpose', 'source', 'createdBy'],
    listSearchableFields: ['externalReference'],
    description:
      'Append-oriented privacy decision/evidence history. Corrections are represented by new records instead of mutating existing history.',
  },
  access: {
    create: ({ req }) => canManageAnyOrganization(req.user),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: () => false,
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeChange: [
      assertOrganizationWriteAccess(['organization-admin', 'editor']),
      assertPrivacyRecordRelationshipsBelongToOrganization,
      normalizePrivacyRecordDates,
      maintainPrivacyRecordAuthor,
    ],
  },
  fields: [
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'contacts',
      required: true,
      index: true,
      admin: {
        description: 'The Contact whose privacy history this event belongs to.',
      },
    },
    {
      name: 'purpose',
      type: 'relationship',
      relationTo: 'privacy-purposes',
      required: true,
      index: true,
      admin: {
        description: 'The processing purpose this privacy event applies to.',
      },
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Granted', value: 'granted' },
        { label: 'Withdrawn', value: 'withdrawn' },
        { label: 'Denied', value: 'denied' },
        { label: 'Basis recorded', value: 'basis-recorded' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Use granted/withdrawn/denied for explicit decisions and basis-recorded when recording a non-consent processing basis or imported evidence.',
      },
    },
    {
      name: 'effectiveAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When this privacy event became effective; may differ from when it was entered into AssoStack.',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Optional expiry. When set, it cannot precede the effective timestamp.',
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      index: true,
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Form', value: 'form' },
        { label: 'Import', value: 'import' },
        { label: 'API', value: 'api' },
        { label: 'Integration', value: 'integration' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Provider-neutral origin metadata for this event.',
      },
    },
    {
      name: 'externalReference',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Optional evidence/import/provider reference. Do not store secret tokens or opaque provider payloads here.',
      },
    },
    {
      name: 'note',
      type: 'textarea',
      maxLength: 2000,
      admin: {
        description: 'Optional concise staff note. Avoid storing unnecessary sensitive data.',
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
        description: 'Staff user that recorded this privacy event. Managed by AssoStack.',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
