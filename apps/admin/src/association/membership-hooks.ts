import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, PayloadRequest } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID, type RelationshipID } from '../access/organizations'

type DocumentLike = Record<string, any>

const valueFromUpdate = (current: DocumentLike, previous: DocumentLike, field: string): unknown =>
  Object.prototype.hasOwnProperty.call(current, field) ? current[field] : previous[field]

const sameRelationshipID = (left: unknown, right: RelationshipID): boolean => {
  const leftID = getRelationshipID(left as any)
  return leftID !== null && String(leftID) === String(right)
}

const validationError = ({ message, path, req }: { message: string; path: string; req: PayloadRequest }) =>
  new ValidationError({
    collection: 'memberships',
    errors: [{ message, path }],
    req,
  })

export const validateMembershipDates: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const startsAt = valueFromUpdate(current, previous, 'startsAt')
  const endsAt = valueFromUpdate(current, previous, 'endsAt')

  if (typeof startsAt !== 'string' || typeof endsAt !== 'string' || !endsAt) return data

  const start = Date.parse(startsAt)
  const end = Date.parse(endsAt)
  if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
    throw validationError({ message: 'Membership end date cannot be before its start date.', path: 'endsAt', req })
  }

  return data
}

const assertSameTenantRelationship = async ({
  collection,
  id,
  organizationID,
  path,
  label,
  req,
}: {
  collection: 'contacts' | 'membership-types'
  id: RelationshipID
  organizationID: RelationshipID
  path: string
  label: string
  req: PayloadRequest
}) => {
  try {
    const document = await req.payload.findByID({ collection, id, depth: 0, overrideAccess: true, req })
    if (!sameRelationshipID(document.organization, organizationID)) throw new Error('cross-tenant relationship')
  } catch {
    throw validationError({ message: `${label} must belong to the same organization as the membership.`, path, req })
  }
}

export const validateMembershipRelationships: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)

  if (organizationID === null) {
    throw validationError({ message: 'A membership must belong to an organization.', path: 'organization', req })
  }

  const contactID = getRelationshipID(valueFromUpdate(current, previous, 'contact') as any)
  if (contactID === null) {
    throw validationError({ message: 'A membership must reference a Contact.', path: 'contact', req })
  }
  await assertSameTenantRelationship({ collection: 'contacts', id: contactID, organizationID, path: 'contact', label: 'Contact', req })

  const typeID = getRelationshipID(valueFromUpdate(current, previous, 'membershipType') as any)
  if (typeID === null) {
    throw validationError({ message: 'A membership must reference a Membership Type.', path: 'membershipType', req })
  }
  await assertSameTenantRelationship({ collection: 'membership-types', id: typeID, organizationID, path: 'membershipType', label: 'Membership Type', req })

  return data
}

export const validateMembershipNumberUniqueness: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const organizationID = getRelationshipID(data?.organization ?? originalDoc?.organization)
  const membershipNumber = valueFromUpdate((data ?? {}) as DocumentLike, (originalDoc ?? {}) as DocumentLike, 'membershipNumber')
  const normalized = typeof membershipNumber === 'string' ? membershipNumber.trim() : ''

  if (organizationID === null || !normalized) return data
  if (data) data.membershipNumber = normalized

  const existing = await req.payload.find({
    collection: 'memberships',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    req,
    where: { and: [{ organization: { equals: organizationID } }, { membershipNumber: { equals: normalized } }] },
  })
  const currentID = getRelationshipID(originalDoc?.id as any)
  if (existing.docs.some((doc) => String(doc.id) !== String(currentID ?? ''))) {
    throw validationError({ message: 'Membership number must be unique within the organization.', path: 'membershipNumber', req })
  }

  return data
}

export const maintainMembershipAttribution: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (!data) return data
  data.createdBy = operation === 'create' ? req.user?.id ?? null : getRelationshipID(originalDoc?.createdBy as any)
  return data
}
