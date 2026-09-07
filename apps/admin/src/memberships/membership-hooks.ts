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
  collection: 'membership-types' | 'memberships'
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
  collection: 'contacts' | 'membership-types'
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
      collection: 'memberships',
      message,
      path,
      req,
    })
  }
}

export const normalizeMembershipTypeKey: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
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
      collection: 'membership-types',
      message: 'A membership type requires a name or key.',
      path: 'key',
      req,
    })
  }

  const normalized = normalizeKey(source)
  if (!normalized) {
    throw validationError({
      collection: 'membership-types',
      message: 'The membership type key must contain at least one letter or number.',
      path: 'key',
      req,
    })
  }

  data.key = normalized
  return data
}

export const ensureMembershipTypeKeyUnique: CollectionBeforeChangeHook = async ({
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
    collection: 'membership-types',
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
      collection: 'membership-types',
      message: 'This membership type key is already used in the same organization.',
      path: 'key',
      req,
    })
  }

  return data
}

export const maintainMembershipTypeArchiveTimestamp: CollectionBeforeChangeHook = ({
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

export const normalizeMembershipNumber: CollectionBeforeValidateHook = ({ data }) => {
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'membershipNumber')) {
    return data
  }

  if (typeof data.membershipNumber !== 'string') {
    return data
  }

  const normalized = data.membershipNumber.trim()
  data.membershipNumber = normalized.length > 0 ? normalized : null
  return data
}

export const assertMembershipRelationshipsBelongToOrganization: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const contactID = getRelationshipID(current.contact ?? previous.contact)
  const membershipTypeID = getRelationshipID(current.membershipType ?? previous.membershipType)

  if (organizationID === null) {
    return data
  }

  if (contactID === null) {
    throw validationError({
      collection: 'memberships',
      message: 'A membership must reference a Contact from its organization.',
      path: 'contact',
      req,
    })
  }

  if (membershipTypeID === null) {
    throw validationError({
      collection: 'memberships',
      message: 'A membership must reference a Membership Type from its organization.',
      path: 'membershipType',
      req,
    })
  }

  await assertRelationshipTenant({
    collection: 'contacts',
    id: contactID,
    organizationID,
    path: 'contact',
    message: 'The Contact must belong to the same organization as the membership.',
    req,
  })

  await assertRelationshipTenant({
    collection: 'membership-types',
    id: membershipTypeID,
    organizationID,
    path: 'membershipType',
    message: 'The Membership Type must belong to the same organization as the membership.',
    req,
  })

  return data
}

export const validateMembershipDates: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (!data) {
    return data
  }

  const startsAt =
    typeof data.startsAt === 'string'
      ? data.startsAt
      : typeof originalDoc?.startsAt === 'string'
        ? originalDoc.startsAt
        : null
  const endsAt =
    typeof data.endsAt === 'string'
      ? data.endsAt
      : data.endsAt === null
        ? null
        : typeof originalDoc?.endsAt === 'string'
          ? originalDoc.endsAt
          : null

  if (startsAt && endsAt) {
    const startTime = Date.parse(startsAt)
    const endTime = Date.parse(endsAt)

    if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime < startTime) {
      throw validationError({
        collection: 'memberships',
        message: 'The membership end date cannot precede its start date.',
        path: 'endsAt',
        req,
      })
    }
  }

  return data
}

export const ensureMembershipNumberUnique: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const membershipNumber = data.membershipNumber ?? originalDoc?.membershipNumber

  if (
    organizationID === null ||
    typeof membershipNumber !== 'string' ||
    membershipNumber.trim().length === 0
  ) {
    return data
  }

  const constraints: Where[] = [
    {
      organization: {
        equals: organizationID,
      },
    },
    {
      membershipNumber: {
        equals: membershipNumber,
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
    collection: 'memberships',
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
      collection: 'memberships',
      message: 'This membership number is already used in the same organization.',
      path: 'membershipNumber',
      req,
    })
  }

  return data
}

export const maintainMembershipAuthor: CollectionBeforeChangeHook = ({
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
    return data
  }

  const originalAuthorID = getRelationshipID(originalDoc?.createdBy)
  if (originalAuthorID !== null) {
    data.createdBy = originalAuthorID
  }

  return data
}
