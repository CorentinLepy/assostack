import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID } from '../access/organizations'

type RelationshipValue = number | string | { id?: number | string } | null | undefined

const relationshipIDs = (value: unknown): Array<number | string> => {
  const items = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]
  const ids = new Map<string, number | string>()

  for (const item of items) {
    if (typeof item === 'number' || typeof item === 'string') {
      ids.set(String(item), item)
      continue
    }

    if (item && typeof item === 'object' && 'id' in item) {
      const id = (item as { id?: unknown }).id
      if (typeof id === 'number' || typeof id === 'string') {
        ids.set(String(id), id)
      }
    }
  }

  return [...ids.values()]
}

const sameRelationshipID = (left: RelationshipValue, right: RelationshipValue): boolean => {
  const leftID = getRelationshipID(left)
  const rightID = getRelationshipID(right)

  return leftID !== null && rightID !== null && String(leftID) === String(rightID)
}

export const assertInteractionContactsBelongToOrganization: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const contacts = relationshipIDs(data.contacts ?? originalDoc?.contacts)

  if (organizationID === null || contacts.length === 0) {
    throw new ValidationError({
      collection: 'interactions',
      errors: [
        {
          message: 'An interaction must reference at least one Contact from its organization.',
          path: 'contacts',
        },
      ],
      req,
    })
  }

  const invalidContactIDs: Array<number | string> = []

  for (const contactID of contacts) {
    try {
      const contact = await req.payload.findByID({
        collection: 'contacts',
        id: contactID,
        depth: 0,
        overrideAccess: true,
        req,
      })

      if (!sameRelationshipID(contact.organization as RelationshipValue, organizationID)) {
        invalidContactIDs.push(contactID)
      }
    } catch {
      invalidContactIDs.push(contactID)
    }
  }

  if (invalidContactIDs.length > 0) {
    throw new ValidationError({
      collection: 'interactions',
      errors: [
        {
          message: 'Every related Contact must belong to the same organization as the interaction.',
          path: 'contacts',
        },
      ],
      req,
    })
  }

  return data
}

export const maintainInteractionAuthor: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (!data) {
    return data
  }

  if (operation === 'create') {
    data.createdBy = req.user?.id ?? null
    return data
  }

  const originalAuthorID = getRelationshipID(originalDoc?.createdBy as RelationshipValue)
  if (originalAuthorID !== null) {
    data.createdBy = originalAuthorID
  }

  return data
}
