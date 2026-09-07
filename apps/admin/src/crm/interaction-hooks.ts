import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID } from '../access/organizations'

type RelationshipValue = number | string | { id?: number | string } | null | undefined

const relationshipIDs = (value: unknown): Array<number | string> => {
  const items = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]

  return items.flatMap((item) => {
    if (typeof item === 'number' || typeof item === 'string') {
      return [item]
    }

    if (item && typeof item === 'object' && 'id' in item) {
      const id = (item as { id?: unknown }).id
      return typeof id === 'number' || typeof id === 'string' ? [id] : []
    }

    return []
  })
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

      if (getRelationshipID(contact.organization as RelationshipValue) !== organizationID) {
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

  if (originalDoc?.createdBy !== undefined) {
    data.createdBy = originalDoc.createdBy
  }

  return data
}
