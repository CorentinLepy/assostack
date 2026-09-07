import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
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
  collection: 'partnership-levels' | 'partnerships'
  message: string
  path: string
  req: PayloadRequest
}) =>
  new ValidationError({
    collection,
    errors: [{ message, path }],
    req,
  })

const valueFromUpdate = (
  current: DocumentLike,
  previous: DocumentLike,
  field: string,
): unknown => (Object.prototype.hasOwnProperty.call(current, field) ? current[field] : previous[field])

const sameRelationshipID = (left: unknown, right: RelationshipID): boolean => {
  const leftID = getRelationshipID(left as any)
  return leftID !== null && String(leftID) === String(right)
}

export const normalizePartnershipLevelKey: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
  req,
}) => {
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
      collection: 'partnership-levels',
      message: 'A partnership level requires a name or key.',
      path: 'key',
      req,
    })
  }

  const normalized = normalizeKey(source)
  if (!normalized) {
    throw validationError({
      collection: 'partnership-levels',
      message: 'The partnership level key must contain at least one letter or number.',
      path: 'key',
      req,
    })
  }

  data.key = normalized
  return data
}

export const normalizePartnershipLevelSortOrder: CollectionBeforeValidateHook = ({ data, req }) => {
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'sortOrder')) {
    return data
  }

  if (data.sortOrder === null || data.sortOrder === undefined || data.sortOrder === '') {
    data.sortOrder = null
    return data
  }

  const sortOrder = typeof data.sortOrder === 'number' ? data.sortOrder : Number(data.sortOrder)

  if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) {
    throw validationError({
      collection: 'partnership-levels',
      message: 'Partnership level sort order must be a non-negative whole number.',
      path: 'sortOrder',
      req,
    })
  }

  data.sortOrder = sortOrder
  return data
}

export const ensurePartnershipLevelKeyUnique: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const key = data.key ?? originalDoc?.key

  if (organizationID === null || typeof key !== 'string' || key.length === 0) {
    return data
  }

  const constraints: Where[] = [
    { organization: { equals: organizationID } },
    { key: { equals: key } },
  ]

  if (originalDoc?.id !== undefined && originalDoc?.id !== null) {
    constraints.push({ id: { not_equals: originalDoc.id } })
  }

  const duplicate = await req.payload.find({
    collection: 'partnership-levels',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { and: constraints },
  })

  if (duplicate.totalDocs > 0) {
    throw validationError({
      collection: 'partnership-levels',
      message: 'This partnership level key is already used in the same organization.',
      path: 'key',
      req,
    })
  }

  return data
}

export const maintainPartnershipLevelArchiveTimestamp: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
}) => {
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

export const preventPartnershipLevelDeleteWhenReferenced: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const partnership = await req.payload.find({
    collection: 'partnerships',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      level: {
        equals: id,
      },
    },
  })

  if (partnership.totalDocs > 0) {
    throw validationError({
      collection: 'partnership-levels',
      message:
        'Partnership levels referenced by partnership history cannot be deleted. Archive the level instead.',
      path: 'id',
      req,
    })
  }
}

export const normalizePartnershipKey: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
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
      collection: 'partnerships',
      message: 'A partnership requires a name or key.',
      path: 'key',
      req,
    })
  }

  const normalized = normalizeKey(source)
  if (!normalized) {
    throw validationError({
      collection: 'partnerships',
      message: 'The partnership key must contain at least one letter or number.',
      path: 'key',
      req,
    })
  }

  data.key = normalized
  return data
}

export const normalizePartnershipDates: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const startsAt = valueFromUpdate(current, previous, 'startsAt')
  const endsAt = valueFromUpdate(current, previous, 'endsAt')

  if (typeof startsAt !== 'string' || typeof endsAt !== 'string') {
    return data
  }

  const startTimestamp = Date.parse(startsAt)
  const endTimestamp = Date.parse(endsAt)

  if (Number.isFinite(startTimestamp) && Number.isFinite(endTimestamp) && endTimestamp < startTimestamp) {
    throw validationError({
      collection: 'partnerships',
      message: 'The partnership end date cannot precede the start date.',
      path: 'endsAt',
      req,
    })
  }

  return data
}

const assertContactTenant = async ({
  id,
  organizationID,
  path,
  req,
}: {
  id: RelationshipID
  organizationID: RelationshipID
  path: 'partner' | 'primaryContact'
  req: PayloadRequest
}) => {
  try {
    const contact = await req.payload.findByID({
      collection: 'contacts',
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (!sameRelationshipID((contact as DocumentLike).organization, organizationID)) {
      throw new Error('cross-tenant contact')
    }
  } catch {
    throw validationError({
      collection: 'partnerships',
      message: 'This Contact must belong to the same organization as the partnership.',
      path,
      req,
    })
  }
}

const assertLevelTenant = async ({
  id,
  organizationID,
  req,
}: {
  id: RelationshipID
  organizationID: RelationshipID
  req: PayloadRequest
}) => {
  try {
    const level = await req.payload.findByID({
      collection: 'partnership-levels',
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (!sameRelationshipID((level as DocumentLike).organization, organizationID)) {
      throw new Error('cross-tenant level')
    }
  } catch {
    throw validationError({
      collection: 'partnerships',
      message: 'The Partnership Level must belong to the same organization as the partnership.',
      path: 'level',
      req,
    })
  }
}

export const assertPartnershipRelationshipsBelongToOrganization: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const partnerID = getRelationshipID(valueFromUpdate(current, previous, 'partner') as any)
  const primaryContactID = getRelationshipID(
    valueFromUpdate(current, previous, 'primaryContact') as any,
  )
  const levelID = getRelationshipID(valueFromUpdate(current, previous, 'level') as any)

  if (organizationID === null) {
    throw validationError({
      collection: 'partnerships',
      message: 'A partnership must belong to an organization.',
      path: 'organization',
      req,
    })
  }

  if (partnerID === null) {
    throw validationError({
      collection: 'partnerships',
      message: 'A partnership must reference a partner Contact.',
      path: 'partner',
      req,
    })
  }

  await assertContactTenant({ id: partnerID, organizationID, path: 'partner', req })

  if (primaryContactID !== null) {
    await assertContactTenant({
      id: primaryContactID,
      organizationID,
      path: 'primaryContact',
      req,
    })
  }

  if (levelID !== null) {
    await assertLevelTenant({ id: levelID, organizationID, req })
  }

  return data
}

export const ensurePartnershipKeyUnique: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const key = data.key ?? originalDoc?.key

  if (organizationID === null || typeof key !== 'string' || key.length === 0) {
    return data
  }

  const constraints: Where[] = [
    { organization: { equals: organizationID } },
    { key: { equals: key } },
  ]

  if (originalDoc?.id !== undefined && originalDoc?.id !== null) {
    constraints.push({ id: { not_equals: originalDoc.id } })
  }

  const duplicate = await req.payload.find({
    collection: 'partnerships',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { and: constraints },
  })

  if (duplicate.totalDocs > 0) {
    throw validationError({
      collection: 'partnerships',
      message: 'This partnership key is already used in the same organization.',
      path: 'key',
      req,
    })
  }

  return data
}

export const maintainPartnershipAuthor: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) {
    return data
  }

  if (operation === 'create') {
    data.createdBy = req.user?.id ?? null
  } else {
    data.createdBy = getRelationshipID(originalDoc?.createdBy as any)
  }

  return data
}
