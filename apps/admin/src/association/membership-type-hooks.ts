import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, PayloadRequest } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID, type RelationshipID } from '../access/organizations'

type DocumentLike = Record<string, any>

const normalizeKey = (value: unknown): string =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : ''

const validationError = ({ message, path, req }: { message: string; path: string; req: PayloadRequest }) =>
  new ValidationError({
    collection: 'membership-types',
    errors: [{ message, path }],
    req,
  })

export const normalizeMembershipTypeKey: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (!data) return data

  const explicitKey = Object.prototype.hasOwnProperty.call(data, 'key') ? data.key : originalDoc?.key
  const normalized = normalizeKey(explicitKey || data.name || originalDoc?.name)

  if (!normalized) {
    throw validationError({
      message: 'Membership type key must contain at least one letter or number.',
      path: 'key',
      req,
    })
  }

  data.key = normalized
  return data
}

export const maintainMembershipTypeArchiveTimestamp: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) return data

  const nextStatus = data.status ?? originalDoc?.status ?? 'active'
  const previousStatus = originalDoc?.status

  if (nextStatus === 'archived') {
    data.archivedAt = previousStatus === 'archived' ? originalDoc?.archivedAt ?? new Date().toISOString() : new Date().toISOString()
  } else {
    data.archivedAt = null
  }

  return data
}

export const validateMembershipTypeUniqueness: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const organizationID = getRelationshipID(data?.organization ?? originalDoc?.organization)
  const key = normalizeKey(data?.key ?? originalDoc?.key)

  if (organizationID === null || !key) return data

  const existing = await req.payload.find({
    collection: 'membership-types',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    req,
    where: {
      and: [{ organization: { equals: organizationID } }, { key: { equals: key } }],
    },
  })

  const currentID = getRelationshipID(originalDoc?.id as any)
  const duplicate = existing.docs.some((doc) => String(doc.id) !== String(currentID ?? ''))

  if (duplicate) {
    throw validationError({
      message: 'Membership type key must be unique within the organization.',
      path: 'key',
      req,
    })
  }

  return data
}
