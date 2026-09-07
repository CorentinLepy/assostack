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
  collection: 'events' | 'event-registrations'
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

const isValidTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date(0))
    return true
  } catch {
    return false
  }
}

export const normalizeEventKey: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (!data) {
    return data
  }

  const source =
    typeof data.key === 'string' && data.key.trim().length > 0
      ? data.key
      : typeof originalDoc?.key === 'string' && originalDoc.key.trim().length > 0
        ? originalDoc.key
        : typeof data.title === 'string'
          ? data.title
          : null

  if (!source) {
    throw validationError({
      collection: 'events',
      message: 'An event requires a title or key.',
      path: 'key',
      req,
    })
  }

  const normalized = normalizeKey(source)
  if (!normalized) {
    throw validationError({
      collection: 'events',
      message: 'The event key must contain at least one letter or number.',
      path: 'key',
      req,
    })
  }

  data.key = normalized
  return data
}

export const normalizeEventDates: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
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
      collection: 'events',
      message: 'The event end timestamp cannot precede the start timestamp.',
      path: 'endsAt',
      req,
    })
  }

  return data
}

export const normalizeEventCapacity: CollectionBeforeValidateHook = ({ data, req }) => {
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
      collection: 'events',
      message: 'Event capacity must be a positive whole number.',
      path: 'capacity',
      req,
    })
  }

  data.capacity = capacity
  return data
}

export const normalizeEventTimezone: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) {
    return data
  }

  let timezone =
    typeof data.timezone === 'string' && data.timezone.trim().length > 0
      ? data.timezone.trim()
      : typeof originalDoc?.timezone === 'string' && originalDoc.timezone.trim().length > 0
        ? originalDoc.timezone.trim()
        : null

  if (!timezone) {
    const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)

    if (organizationID !== null) {
      try {
        const organization = await req.payload.findByID({
          collection: 'organizations',
          id: organizationID,
          depth: 0,
          overrideAccess: true,
          req,
        })
        const configuredTimezone = (organization as DocumentLike).settings?.timezone
        if (typeof configuredTimezone === 'string' && configuredTimezone.trim().length > 0) {
          timezone = configuredTimezone.trim()
        }
      } catch {
        // Organization write access and tenant ownership are validated separately.
      }
    }
  }

  timezone ??= 'UTC'

  if (!isValidTimezone(timezone)) {
    throw validationError({
      collection: 'events',
      message: 'Use a valid IANA timezone identifier such as Europe/Paris.',
      path: 'timezone',
      req,
    })
  }

  data.timezone = timezone
  return data
}

export const ensureEventKeyUnique: CollectionBeforeChangeHook = async ({
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
    collection: 'events',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { and: constraints },
  })

  if (duplicate.totalDocs > 0) {
    throw validationError({
      collection: 'events',
      message: 'This event key is already used in the same organization.',
      path: 'key',
      req,
    })
  }

  return data
}

export const maintainEventAuthor: CollectionBeforeChangeHook = ({
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

export const preventEventDeleteWhenRegistered: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const registration = await req.payload.find({
    collection: 'event-registrations',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      event: {
        equals: id,
      },
    },
  })

  if (registration.totalDocs > 0) {
    throw validationError({
      collection: 'events',
      message: 'Events with registration history cannot be deleted. Cancel or complete the event instead.',
      path: 'id',
      req,
    })
  }
}

const assertRelationshipTenant = async ({
  collection,
  id,
  organizationID,
  path,
  message,
  req,
}: {
  collection: 'events' | 'contacts'
  id: RelationshipID
  organizationID: RelationshipID
  path: 'event' | 'contact'
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
      collection: 'event-registrations',
      message,
      path,
      req,
    })
  }
}

export const assertEventRegistrationRelationshipsBelongToOrganization: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const eventID = getRelationshipID(valueFromUpdate(current, previous, 'event') as any)
  const contactID = getRelationshipID(valueFromUpdate(current, previous, 'contact') as any)

  if (organizationID === null) {
    throw validationError({
      collection: 'event-registrations',
      message: 'A registration must belong to an organization.',
      path: 'organization',
      req,
    })
  }

  if (eventID === null) {
    throw validationError({
      collection: 'event-registrations',
      message: 'A registration must reference an Event from its organization.',
      path: 'event',
      req,
    })
  }

  if (contactID === null) {
    throw validationError({
      collection: 'event-registrations',
      message: 'A registration must reference a Contact from its organization.',
      path: 'contact',
      req,
    })
  }

  await assertRelationshipTenant({
    collection: 'events',
    id: eventID,
    organizationID,
    path: 'event',
    message: 'The Event must belong to the same organization as the registration.',
    req,
  })

  await assertRelationshipTenant({
    collection: 'contacts',
    id: contactID,
    organizationID,
    path: 'contact',
    message: 'The Contact must belong to the same organization as the registration.',
    req,
  })

  return data
}

export const ensureEventRegistrationUnique: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const eventID = getRelationshipID(valueFromUpdate(current, previous, 'event') as any)
  const contactID = getRelationshipID(valueFromUpdate(current, previous, 'contact') as any)

  if (organizationID === null || eventID === null || contactID === null) {
    return data
  }

  const constraints: Where[] = [
    { organization: { equals: organizationID } },
    { event: { equals: eventID } },
    { contact: { equals: contactID } },
  ]

  if (originalDoc?.id !== undefined && originalDoc?.id !== null) {
    constraints.push({ id: { not_equals: originalDoc.id } })
  }

  const duplicate = await req.payload.find({
    collection: 'event-registrations',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { and: constraints },
  })

  if (duplicate.totalDocs > 0) {
    throw validationError({
      collection: 'event-registrations',
      message: 'This Contact already has a registration record for the Event. Update its status instead.',
      path: 'contact',
      req,
    })
  }

  return data
}

export const maintainEventRegistrationAuthor: CollectionBeforeChangeHook = ({
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
