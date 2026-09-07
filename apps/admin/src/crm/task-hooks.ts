import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'
import { ValidationError } from 'payload'

import {
  getRelationshipID,
  hasOrganizationRole,
  type RelationshipID,
} from '../access/organizations'

type DocumentLike = Record<string, any>

const relationshipIDs = (value: unknown): RelationshipID[] => {
  const values = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]

  return values.flatMap((item) => {
    const id = getRelationshipID(item as any)
    return id === null ? [] : [id]
  })
}

const validateContacts = async ({
  contactIDs,
  organizationID,
  req,
}: {
  contactIDs: RelationshipID[]
  organizationID: RelationshipID
  req: PayloadRequest
}) => {
  for (const contactID of contactIDs) {
    try {
      const contact = await req.payload.findByID({
        collection: 'contacts',
        id: contactID,
        depth: 0,
        overrideAccess: true,
        req,
      })

      if (String(getRelationshipID(contact.organization as any)) !== String(organizationID)) {
        throw new Error('cross-tenant contact')
      }
    } catch {
      throw new ValidationError({
        collection: 'tasks',
        errors: [
          {
            message: 'Every related Contact must belong to the same organization as the task.',
            path: 'contacts',
          },
        ],
        req,
      })
    }
  }
}

const validateAssignee = async ({
  assigneeID,
  organizationID,
  req,
}: {
  assigneeID: RelationshipID
  organizationID: RelationshipID
  req: PayloadRequest
}) => {
  try {
    const user = await req.payload.findByID({
      collection: 'users',
      id: assigneeID,
      depth: 1,
      overrideAccess: true,
      req,
    })

    if (!hasOrganizationRole(user, organizationID, ['organization-admin', 'editor'])) {
      throw new Error('assignee is not staff in task tenant')
    }
  } catch {
    throw new ValidationError({
      collection: 'tasks',
      errors: [
        {
          message: 'The assignee must be a staff user for the task organization.',
          path: 'assignee',
        },
      ],
      req,
    })
  }
}

export const validateTaskRelationships: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)

  if (organizationID === null) {
    throw new ValidationError({
      collection: 'tasks',
      errors: [
        {
          message: 'A task must belong to an organization.',
          path: 'organization',
        },
      ],
      req,
    })
  }

  const contactIDs = relationshipIDs(
    Object.prototype.hasOwnProperty.call(current, 'contacts') ? current.contacts : previous.contacts,
  )
  if (contactIDs.length > 0) {
    await validateContacts({ contactIDs, organizationID, req })
  }

  const assigneeID = getRelationshipID(
    (Object.prototype.hasOwnProperty.call(current, 'assignee') ? current.assignee : previous.assignee) as any,
  )
  if (assigneeID !== null) {
    await validateAssignee({ assigneeID, organizationID, req })
  }

  return data
}

export const maintainTaskLifecycle: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (!data) {
    return data
  }

  const nextStatus = data.status ?? originalDoc?.status ?? 'open'
  const previousStatus = originalDoc?.status

  if (nextStatus === 'completed' && previousStatus !== 'completed') {
    data.completedAt = new Date().toISOString()
    data.completedBy = req.user?.id ?? null
  } else if (nextStatus !== 'completed') {
    data.completedAt = null
    data.completedBy = null
  }

  if (operation === 'create') {
    data.createdBy = req.user?.id ?? null
  } else if (originalDoc?.createdBy !== undefined) {
    data.createdBy = originalDoc.createdBy
  }

  return data
}
