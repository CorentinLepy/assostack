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
  collection: 'volunteer-shifts' | 'volunteer-assignments'
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

export const normalizeVolunteerShiftKey: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
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
      collection: 'volunteer-shifts',
      message: 'A volunteer shift requires a name or key.',
      path: 'key',
      req,
    })
  }

  const normalized = normalizeKey(source)
  if (!normalized) {
    throw validationError({
      collection: 'volunteer-shifts',
      message: 'The volunteer shift key must contain at least one letter or number.',
      path: 'key',
      req,
    })
  }

  data.key = normalized
  return data
}

export const normalizeVolunteerShiftDates: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const startsAt = valueFromUpdate(current, previous, 'startsAt')
  const endsAt = valueFromUpdate(current, previous, 'endsAt')

  if (typeof startsAt !== 'string' || typeof endsAt !== 'string') {
    return data
  }

  const startTimestamp = Date.parse(startsAt)
  const endTimestamp = Date.parse(endsAt)

  if (
    Number.isFinite(startTimestamp) &&
    Number.isFinite(endTimestamp) &&
    endTimestamp <= startTimestamp
  ) {
    throw validationError({
      collection: 'volunteer-shifts',
      message: 'The volunteer shift end timestamp must be after the start timestamp.',
      path: 'endsAt',
      req,
    })
  }

  return data
}

export const normalizeVolunteerShiftCapacity: CollectionBeforeValidateHook = ({ data, req }) => {
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'capacity')) {
    return data
  }

  if (data.capacity === null || data.capacity === undefined || data.capacity === '') {
    data.capacity = null
    return data
  }

  const capacity = typeof data.capacity === 'number' ? data.capacity : Number(data.capacity)

  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    throw validationError({
      collection: 'volunteer-shifts',
      message: 'Volunteer shift capacity must be a positive whole number.',
      path: 'capacity',
      req,
    })
  }

  data.capacity = capacity
  return data
}

export const assertVolunteerShiftEventBelongsToOrganization: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const eventID = getRelationshipID(valueFromUpdate(current, previous, 'event') as any)

  if (organizationID === null) {
    throw validationError({
      collection: 'volunteer-shifts',
      message: 'A volunteer shift must belong to an organization.',
      path: 'organization',
      req,
    })
  }

  if (eventID === null) {
    throw validationError({
      collection: 'volunteer-shifts',
      message: 'A volunteer shift must reference an Event from its organization.',
      path: 'event',
      req,
    })
  }

  try {
    const event = await req.payload.findByID({
      collection: 'events',
      id: eventID,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (!sameRelationshipID((event as DocumentLike).organization, organizationID)) {
      throw new Error('cross-tenant event')
    }
  } catch {
    throw validationError({
      collection: 'volunteer-shifts',
      message: 'The Event must belong to the same organization as the volunteer shift.',
      path: 'event',
      req,
    })
  }

  return data
}

export const ensureVolunteerShiftKeyUnique: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const eventID = getRelationshipID(valueFromUpdate(current, previous, 'event') as any)
  const key = valueFromUpdate(current, previous, 'key')

  if (
    organizationID === null ||
    eventID === null ||
    typeof key !== 'string' ||
    key.length === 0
  ) {
    return data
  }

  const constraints: Where[] = [
    { organization: { equals: organizationID } },
    { event: { equals: eventID } },
    { key: { equals: key } },
  ]

  if (originalDoc?.id !== undefined && originalDoc?.id !== null) {
    constraints.push({ id: { not_equals: originalDoc.id } })
  }

  const duplicate = await req.payload.find({
    collection: 'volunteer-shifts',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { and: constraints },
  })

  if (duplicate.totalDocs > 0) {
    throw validationError({
      collection: 'volunteer-shifts',
      message: 'This volunteer shift key is already used inside the same Event.',
      path: 'key',
      req,
    })
  }

  return data
}

export const maintainVolunteerShiftAuthor: CollectionBeforeChangeHook = ({
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

export const preventVolunteerShiftDeleteWhenAssigned: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const assignment = await req.payload.find({
    collection: 'volunteer-assignments',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      shift: {
        equals: id,
      },
    },
  })

  if (assignment.totalDocs > 0) {
    throw validationError({
      collection: 'volunteer-shifts',
      message:
        'Volunteer shifts with assignment history cannot be deleted. Cancel or complete the shift instead.',
      path: 'id',
      req,
    })
  }
}

const fetchSameTenantContact = async ({
  contactID,
  organizationID,
  req,
}: {
  contactID: RelationshipID
  organizationID: RelationshipID
  req: PayloadRequest
}) => {
  try {
    const contact = await req.payload.findByID({
      collection: 'contacts',
      id: contactID,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (!sameRelationshipID((contact as DocumentLike).organization, organizationID)) {
      throw new Error('cross-tenant contact')
    }
  } catch {
    throw validationError({
      collection: 'volunteer-assignments',
      message: 'The Contact must belong to the same organization as the volunteer assignment.',
      path: 'contact',
      req,
    })
  }
}

const fetchSameTenantShiftAndEvent = async ({
  shiftID,
  organizationID,
  req,
}: {
  shiftID: RelationshipID
  organizationID: RelationshipID
  req: PayloadRequest
}) => {
  try {
    const shift = await req.payload.findByID({
      collection: 'volunteer-shifts',
      id: shiftID,
      depth: 0,
      overrideAccess: true,
      req,
    }) as DocumentLike

    if (!sameRelationshipID(shift.organization, organizationID)) {
      throw new Error('cross-tenant shift')
    }

    const eventID = getRelationshipID(shift.event as any)
    if (eventID === null) {
      throw new Error('missing event')
    }

    const event = await req.payload.findByID({
      collection: 'events',
      id: eventID,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (!sameRelationshipID((event as DocumentLike).organization, organizationID)) {
      throw new Error('cross-tenant parent event')
    }
  } catch {
    throw validationError({
      collection: 'volunteer-assignments',
      message:
        'The Volunteer Shift and its Event must belong to the same organization as the assignment.',
      path: 'shift',
      req,
    })
  }
}

export const assertVolunteerAssignmentRelationshipsBelongToOrganization: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const shiftID = getRelationshipID(valueFromUpdate(current, previous, 'shift') as any)
  const contactID = getRelationshipID(valueFromUpdate(current, previous, 'contact') as any)

  if (organizationID === null) {
    throw validationError({
      collection: 'volunteer-assignments',
      message: 'A volunteer assignment must belong to an organization.',
      path: 'organization',
      req,
    })
  }

  if (shiftID === null) {
    throw validationError({
      collection: 'volunteer-assignments',
      message: 'A volunteer assignment must reference a Volunteer Shift.',
      path: 'shift',
      req,
    })
  }

  if (contactID === null) {
    throw validationError({
      collection: 'volunteer-assignments',
      message: 'A volunteer assignment must reference a CRM Contact.',
      path: 'contact',
      req,
    })
  }

  await fetchSameTenantShiftAndEvent({ shiftID, organizationID, req })
  await fetchSameTenantContact({ contactID, organizationID, req })

  return data
}

export const ensureVolunteerAssignmentUnique: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const shiftID = getRelationshipID(valueFromUpdate(current, previous, 'shift') as any)
  const contactID = getRelationshipID(valueFromUpdate(current, previous, 'contact') as any)

  if (organizationID === null || shiftID === null || contactID === null) {
    return data
  }

  const constraints: Where[] = [
    { organization: { equals: organizationID } },
    { shift: { equals: shiftID } },
    { contact: { equals: contactID } },
  ]

  if (originalDoc?.id !== undefined && originalDoc?.id !== null) {
    constraints.push({ id: { not_equals: originalDoc.id } })
  }

  const duplicate = await req.payload.find({
    collection: 'volunteer-assignments',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { and: constraints },
  })

  if (duplicate.totalDocs > 0) {
    throw validationError({
      collection: 'volunteer-assignments',
      message:
        'This Contact already has an assignment record for the Volunteer Shift. Update its status instead.',
      path: 'contact',
      req,
    })
  }

  return data
}

export const maintainVolunteerAssignmentAuthor: CollectionBeforeChangeHook = ({
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
