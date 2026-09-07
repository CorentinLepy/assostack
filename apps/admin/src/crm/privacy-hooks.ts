import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
  Where,
} from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID, type RelationshipID } from '../access/organizations'

type DocumentLike = Record<string, any>

const normalizeKey = (input: string): string =>
  input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const validationError = ({
  collection,
  message,
  path,
  req,
}: {
  collection: string
  message: string
  path: string
  req: PayloadRequest
}) =>
  new ValidationError({
    collection,
    errors: [{ message, path }],
    req,
  })

const sameRelationshipID = (left: unknown, right: RelationshipID): boolean => {
  const leftID = getRelationshipID(left as any)
  return leftID !== null && String(leftID) === String(right)
}

const assertRelationshipTenant = async ({
  collection,
  id,
  organizationID,
  path,
  message,
  req,
}: {
  collection: 'contacts' | 'privacy-purposes'
  id: RelationshipID
  organizationID: RelationshipID
  path: string
  message: string
  req: PayloadRequest
}) => {
  try {
    const record = await req.payload.findByID({
      collection,
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (!sameRelationshipID((record as DocumentLike).organization, organizationID)) {
      throw new Error('cross-tenant relationship')
    }
  } catch {
    throw validationError({
      collection: 'privacy-records',
      message,
      path,
      req,
    })
  }
}

export const normalizePrivacyPurposeKey: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (!data) {
    return data
  }

  const source =
    typeof data.key === 'string' && data.key.trim().length > 0
      ? data.key
      : typeof originalDoc?.key === 'string' && originalDoc.key.trim().length > 0
        ? originalDoc.key
        : typeof data.name === 'string'
          ? data.name
          : null

  if (!source) {
    throw validationError({
      collection: 'privacy-purposes',
      message: 'A privacy purpose requires a name or key.',
      path: 'key',
      req,
    })
  }

  const normalized = normalizeKey(source)
  if (!normalized) {
    throw validationError({
      collection: 'privacy-purposes',
      message: 'The privacy purpose key must contain at least one letter or number.',
      path: 'key',
      req,
    })
  }

  data.key = normalized
  return data
}

export const ensurePrivacyPurposeKeyUnique: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const key = data.key ?? originalDoc?.key

  if (organizationID === null || typeof key !== 'string' || key.length === 0) {
    return data
  }

  const constraints: Where[] = [
    {
      organization: {
        equals: organizationID,
      },
    },
    {
      key: {
        equals: key,
      },
    },
  ]

  if (originalDoc?.id !== undefined && originalDoc?.id !== null) {
    constraints.push({
      id: {
        not_equals: originalDoc.id,
      },
    })
  }

  const duplicate = await req.payload.find({
    collection: 'privacy-purposes',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      and: constraints,
    },
  })

  if (duplicate.totalDocs > 0) {
    throw validationError({
      collection: 'privacy-purposes',
      message: 'This privacy purpose key is already used in the same organization.',
      path: 'key',
      req,
    })
  }

  return data
}

export const maintainPrivacyPurposeArchiveTimestamp: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) {
    return data
  }

  const nextStatus = data.status ?? originalDoc?.status ?? 'active'
  const previousStatus = originalDoc?.status

  if (nextStatus === 'archived') {
    if (previousStatus !== 'archived') {
      data.archivedAt = new Date().toISOString()
    } else {
      data.archivedAt = originalDoc?.archivedAt ?? null
    }
  } else {
    data.archivedAt = null
  }

  return data
}

export const assertPrivacyRecordRelationshipsBelongToOrganization: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const contactID = getRelationshipID(current.contact ?? previous.contact)
  const purposeID = getRelationshipID(current.purpose ?? previous.purpose)

  if (organizationID === null) {
    return data
  }

  if (contactID === null) {
    throw validationError({
      collection: 'privacy-records',
      message: 'A Privacy Record must reference a Contact from its organization.',
      path: 'contact',
      req,
    })
  }

  if (purposeID === null) {
    throw validationError({
      collection: 'privacy-records',
      message: 'A Privacy Record must reference a Privacy Purpose from its organization.',
      path: 'purpose',
      req,
    })
  }

  await assertRelationshipTenant({
    collection: 'contacts',
    id: contactID,
    organizationID,
    path: 'contact',
    message: 'The Contact must belong to the same organization as the Privacy Record.',
    req,
  })

  await assertRelationshipTenant({
    collection: 'privacy-purposes',
    id: purposeID,
    organizationID,
    path: 'purpose',
    message: 'The Privacy Purpose must belong to the same organization as the Privacy Record.',
    req,
  })

  return data
}

export const normalizePrivacyRecordDates: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (!data) {
    return data
  }

  const effectiveAt =
    typeof data.effectiveAt === 'string'
      ? data.effectiveAt
      : typeof originalDoc?.effectiveAt === 'string'
        ? originalDoc.effectiveAt
        : operation === 'create'
          ? new Date().toISOString()
          : null

  if (effectiveAt && operation === 'create' && !data.effectiveAt) {
    data.effectiveAt = effectiveAt
  }

  const expiresAt =
    typeof data.expiresAt === 'string'
      ? data.expiresAt
      : typeof originalDoc?.expiresAt === 'string'
        ? originalDoc.expiresAt
        : null

  if (effectiveAt && expiresAt) {
    const effectiveTime = Date.parse(effectiveAt)
    const expiryTime = Date.parse(expiresAt)

    if (!Number.isNaN(effectiveTime) && !Number.isNaN(expiryTime) && expiryTime < effectiveTime) {
      throw validationError({
        collection: 'privacy-records',
        message: 'The privacy record expiry cannot precede its effective timestamp.',
        path: 'expiresAt',
        req,
      })
    }
  }

  return data
}

export const maintainPrivacyRecordAuthor: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (!data) {
    return data
  }

  if (operation === 'create') {
    data.createdBy = req.user?.id ?? null
    return data
  }

  const originalAuthorID = getRelationshipID(originalDoc?.createdBy)
  if (originalAuthorID !== null) {
    data.createdBy = originalAuthorID
  }

  return data
}
