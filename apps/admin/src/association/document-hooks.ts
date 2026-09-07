import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID } from '../access/organizations'

type RelationshipValue = number | string | { id?: number | string } | null | undefined

const sameRelationshipID = (left: RelationshipValue, right: RelationshipValue): boolean => {
  const leftID = getRelationshipID(left)
  const rightID = getRelationshipID(right)
  return leftID !== null && rightID !== null && String(leftID) === String(rightID)
}

export const assertDocumentContactBelongsToOrganization: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const contactID = getRelationshipID((data.contact ?? originalDoc?.contact) as RelationshipValue)

  if (organizationID === null) {
    return data
  }

  if (contactID === null) {
    return data
  }

  try {
    const contact = await req.payload.findByID({
      collection: 'contacts',
      id: contactID,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (!sameRelationshipID(contact.organization as RelationshipValue, organizationID)) {
      throw new Error('tenant mismatch')
    }
  } catch {
    throw new ValidationError({
      collection: 'documents',
      errors: [
        {
          message: 'The related Contact must belong to the same organization as the document.',
          path: 'contact',
        },
      ],
      req,
    })
  }

  return data
}

export const maintainDocumentAuthor: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (!data) return data

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
