import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, PayloadRequest, Where } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID, type RelationshipID } from '../access/organizations'

type DocumentLike = Record<string, any>

const normalizeSlug = (input: string): string =>
  input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const validationError = ({
  message,
  path,
  req,
  collection = 'contact-tags',
}: {
  message: string
  path: string
  req: PayloadRequest
  collection?: string
}) =>
  new ValidationError({
    collection,
    errors: [{ message, path }],
    req,
  })

const relationshipIDs = (value: unknown): RelationshipID[] => {
  const values = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]
  const unique = new Map<string, RelationshipID>()

  for (const item of values) {
    const id = getRelationshipID(item as any)
    if (id !== null) {
      unique.set(String(id), id)
    }
  }

  return [...unique.values()]
}

const sameRelationshipID = (left: unknown, right: RelationshipID): boolean => {
  const leftID = getRelationshipID(left as any)
  return leftID !== null && String(leftID) === String(right)
}

export const normalizeContactTagSlug: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (!data) {
    return data
  }

  const source =
    typeof data.slug === 'string' && data.slug.trim().length > 0
      ? data.slug
      : typeof originalDoc?.slug === 'string' && originalDoc.slug.trim().length > 0
        ? originalDoc.slug
        : typeof data.name === 'string'
          ? data.name
          : null

  if (!source) {
    throw validationError({
      message: 'A contact tag requires a name or slug.',
      path: 'slug',
      req,
    })
  }

  const normalized = normalizeSlug(source)
  if (!normalized) {
    throw validationError({
      message: 'The contact tag slug must contain at least one letter or number.',
      path: 'slug',
      req,
    })
  }

  data.slug = normalized
  return data
}

export const ensureContactTagSlugUnique: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const slug = data.slug ?? originalDoc?.slug

  if (organizationID === null || typeof slug !== 'string' || slug.length === 0) {
    return data
  }

  const constraints: Where[] = [
    {
      organization: {
        equals: organizationID,
      },
    },
    {
      slug: {
        equals: slug,
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
    collection: 'contact-tags',
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
      message: 'This contact tag slug is already used in the same organization.',
      path: 'slug',
      req,
    })
  }

  return data
}

export const maintainContactTagArchiveTimestamp: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
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

export const validateContactTagsBelongToOrganization: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)

  if (organizationID === null) {
    return data
  }

  const rawTags = Object.prototype.hasOwnProperty.call(current, 'tags') ? current.tags : previous.tags
  const tagIDs = relationshipIDs(rawTags)

  for (const tagID of tagIDs) {
    try {
      const tag = await req.payload.findByID({
        collection: 'contact-tags',
        id: tagID,
        depth: 0,
        overrideAccess: true,
        req,
      })

      if (!sameRelationshipID(tag.organization, organizationID)) {
        throw new Error('cross-tenant contact tag')
      }
    } catch {
      throw validationError({
        collection: 'contacts',
        message: 'Every assigned Tag must belong to the same organization as the Contact.',
        path: 'tags',
        req,
      })
    }
  }

  return data
}
