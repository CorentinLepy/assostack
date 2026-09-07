import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
} from 'payload'
import { ValidationError } from 'payload'

import {
  getRelationshipID,
  hasOrganizationRole,
  type RelationshipID,
} from '../access/organizations'

type DocumentLike = Record<string, any>

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

const valueFromUpdate = (
  current: DocumentLike,
  previous: DocumentLike,
  field: string,
): unknown => (Object.prototype.hasOwnProperty.call(current, field) ? current[field] : previous[field])

const validationError = ({
  message,
  path,
  req,
}: {
  message: string
  path: string
  req: PayloadRequest
}) =>
  new ValidationError({
    collection: 'tasks',
    errors: [{ message, path }],
    req,
  })

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

      if (!sameRelationshipID(contact.organization, organizationID)) {
        throw new Error('cross-tenant contact')
      }
    } catch {
      throw validationError({
        message: 'Every related Contact must belong to the same organization as the task.',
        path: 'contacts',
        req,
      })
    }
  }
}

const validateRelatedInteraction = async ({
  interactionID,
  organizationID,
  req,
}: {
  interactionID: RelationshipID
  organizationID: RelationshipID
  req: PayloadRequest
}) => {
  try {
    const interaction = await req.payload.findByID({
      collection: 'interactions',
      id: interactionID,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (!sameRelationshipID(interaction.organization, organizationID)) {
      throw new Error('cross-tenant interaction')
    }
  } catch {
    throw validationError({
      message: 'The related Interaction must belong to the same organization as the task.',
      path: 'relatedInteraction',
      req,
    })
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
    throw validationError({
      message: 'The assignee must be a staff user for the task organization.',
      path: 'assignee',
      req,
    })
  }
}

export const validateTaskReminderWindow: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const dueAt = valueFromUpdate(current, previous, 'dueAt')
  const remindAt = valueFromUpdate(current, previous, 'remindAt')

  if (typeof dueAt !== 'string' || typeof remindAt !== 'string') {
    return data
  }

  const dueTimestamp = Date.parse(dueAt)
  const reminderTimestamp = Date.parse(remindAt)

  if (
    Number.isFinite(dueTimestamp) &&
    Number.isFinite(reminderTimestamp) &&
    reminderTimestamp > dueTimestamp
  ) {
    throw validationError({
      message: 'The reminder must be scheduled at or before the task due date.',
      path: 'remindAt',
      req,
    })
  }

  return data
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
    throw validationError({
      message: 'A task must belong to an organization.',
      path: 'organization',
      req,
    })
  }

  const contactIDs = relationshipIDs(valueFromUpdate(current, previous, 'contacts'))
  if (contactIDs.length > 0) {
    await validateContacts({ contactIDs, organizationID, req })
  }

  const interactionID = getRelationshipID(valueFromUpdate(current, previous, 'relatedInteraction') as any)
  if (interactionID !== null) {
    await validateRelatedInteraction({ interactionID, organizationID, req })
  }

  const assigneeID = getRelationshipID(valueFromUpdate(current, previous, 'assignee') as any)
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

  if (nextStatus === 'completed') {
    if (previousStatus !== 'completed') {
      data.completedAt = new Date().toISOString()
      data.completedBy = req.user?.id ?? null
    } else {
      data.completedAt = originalDoc?.completedAt ?? null
      data.completedBy = getRelationshipID(originalDoc?.completedBy as any)
    }
  } else {
    data.completedAt = null
    data.completedBy = null
  }

  if (operation === 'create') {
    data.createdBy = req.user?.id ?? null
  } else {
    data.createdBy = getRelationshipID(originalDoc?.createdBy as any)
  }

  return data
}
