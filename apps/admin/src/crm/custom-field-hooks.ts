import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID } from '../access/organizations'

type RelationshipValue = number | string | { id?: number | string } | null | undefined

type DefinitionLike = {
  id?: number | string
  organization?: RelationshipValue
  key?: string | null
  label?: string | null
  type?: string | null
  status?: string | null
  options?: Array<{ label?: string | null; value?: string | null }> | null
}

const normalizeKey = (value: unknown): string =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : ''

const sameRelationshipID = (left: RelationshipValue, right: RelationshipValue): boolean => {
  const leftID = getRelationshipID(left)
  const rightID = getRelationshipID(right)
  return leftID !== null && rightID !== null && String(leftID) === String(rightID)
}

const error = (collection: string, path: string, message: string, req: any) =>
  new ValidationError({ collection, errors: [{ path, message }], req })

export const normalizeCustomFieldDefinitionKey: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (!data) return data

  const source = Object.prototype.hasOwnProperty.call(data, 'key') ? data.key : originalDoc?.key
  const normalized = normalizeKey(source || data.label || originalDoc?.label)
  if (!normalized) {
    throw error('custom-field-definitions', 'key', 'Custom field key must contain at least one letter or number.', req)
  }
  data.key = normalized
  return data
}

export const validateCustomFieldDefinition: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data

  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const key = normalizeKey(data.key ?? originalDoc?.key)
  const type = data.type ?? originalDoc?.type
  const options = (data.options ?? originalDoc?.options ?? []) as Array<{ label?: string; value?: string }>

  if (organizationID === null || !key) return data

  if (['single-select', 'multi-select'].includes(type)) {
    if (!Array.isArray(options) || options.length === 0) {
      throw error('custom-field-definitions', 'options', 'Select custom fields require at least one option.', req)
    }
    const values = new Set<string>()
    for (const option of options) {
      const value = typeof option?.value === 'string' ? option.value.trim() : ''
      const label = typeof option?.label === 'string' ? option.label.trim() : ''
      if (!value || !label) {
        throw error('custom-field-definitions', 'options', 'Every select option needs a label and value.', req)
      }
      if (values.has(value)) {
        throw error('custom-field-definitions', 'options', 'Select option values must be unique within a field.', req)
      }
      values.add(value)
    }
  } else if (Array.isArray(options) && options.length > 0) {
    throw error('custom-field-definitions', 'options', 'Options are only valid for select custom fields.', req)
  }

  const existing = await req.payload.find({
    collection: 'custom-field-definitions',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    req,
    where: { and: [{ organization: { equals: organizationID } }, { key: { equals: key } }] },
  })
  const currentID = originalDoc?.id
  if (existing.docs.some((doc: any) => String(doc.id) !== String(currentID ?? ''))) {
    throw error('custom-field-definitions', 'key', 'Custom field key must be unique within the organization.', req)
  }

  if (originalDoc?.type && data.type && data.type !== originalDoc.type) {
    const values = await req.payload.find({
      collection: 'contact-custom-field-values',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
      where: { field: { equals: originalDoc.id } },
    })
    if (values.totalDocs > 0) {
      throw error('custom-field-definitions', 'type', 'A custom field type cannot change after values exist.', req)
    }
  }

  return data
}

export const maintainCustomFieldArchiveTimestamp: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) return data
  const nextStatus = data.status ?? originalDoc?.status ?? 'active'
  const previousStatus = originalDoc?.status
  data.archivedAt =
    nextStatus === 'archived'
      ? previousStatus === 'archived'
        ? originalDoc?.archivedAt ?? new Date().toISOString()
        : new Date().toISOString()
      : null
  return data
}

const valuePresence = (data: Record<string, any>) => ({
  text: data.textValue !== undefined && data.textValue !== null && data.textValue !== '',
  number: data.numberValue !== undefined && data.numberValue !== null,
  boolean: data.booleanValue !== undefined && data.booleanValue !== null,
  date: data.dateValue !== undefined && data.dateValue !== null && data.dateValue !== '',
  single: data.singleSelectValue !== undefined && data.singleSelectValue !== null && data.singleSelectValue !== '',
  multi: Array.isArray(data.multiSelectValue) && data.multiSelectValue.length > 0,
})

export const validateContactCustomFieldValue: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data

  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const contactID = getRelationshipID((data.contact ?? originalDoc?.contact) as RelationshipValue)
  const fieldID = getRelationshipID((data.field ?? originalDoc?.field) as RelationshipValue)
  if (organizationID === null || contactID === null || fieldID === null) {
    throw error('contact-custom-field-values', 'field', 'A custom value requires an organization, Contact and field definition.', req)
  }

  let contact: any
  let field: DefinitionLike
  try {
    ;[contact, field] = await Promise.all([
      req.payload.findByID({ collection: 'contacts', id: contactID, depth: 0, overrideAccess: true, req }),
      req.payload.findByID({ collection: 'custom-field-definitions', id: fieldID, depth: 0, overrideAccess: true, req }),
    ])
  } catch {
    throw error('contact-custom-field-values', 'field', 'The referenced Contact and custom field must exist.', req)
  }

  if (!sameRelationshipID(contact.organization, organizationID)) {
    throw error('contact-custom-field-values', 'contact', 'The Contact must belong to the same organization as the custom value.', req)
  }
  if (!sameRelationshipID(field.organization, organizationID)) {
    throw error('contact-custom-field-values', 'field', 'The custom field must belong to the same organization as the custom value.', req)
  }

  const merged = { ...(originalDoc ?? {}), ...data }
  const presence = valuePresence(merged)
  const activeKeys = Object.entries(presence).filter(([, present]) => present).map(([key]) => key)
  const expectedKey: Record<string, string> = {
    'short-text': 'text',
    'long-text': 'text',
    number: 'number',
    boolean: 'boolean',
    date: 'date',
    'single-select': 'single',
    'multi-select': 'multi',
  }
  const expected = expectedKey[String(field.type)]

  if (!expected || activeKeys.length !== 1 || activeKeys[0] !== expected) {
    throw error('contact-custom-field-values', 'field', `Value must use exactly the storage field for custom type ${String(field.type)}.`, req)
  }

  const allowedOptions = new Set((field.options ?? []).map((option) => String(option.value ?? '')))
  if (field.type === 'single-select' && !allowedOptions.has(String(merged.singleSelectValue))) {
    throw error('contact-custom-field-values', 'singleSelectValue', 'Selected value is not configured for this custom field.', req)
  }
  if (field.type === 'multi-select') {
    const selected = Array.isArray(merged.multiSelectValue) ? merged.multiSelectValue : []
    if (selected.some((value: any) => !allowedOptions.has(String(value)))) {
      throw error('contact-custom-field-values', 'multiSelectValue', 'Every selected value must be configured for this custom field.', req)
    }
  }

  const existing = await req.payload.find({
    collection: 'contact-custom-field-values',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    req,
    where: { and: [{ contact: { equals: contactID } }, { field: { equals: fieldID } }] },
  })
  if (existing.docs.some((doc: any) => String(doc.id) !== String(originalDoc?.id ?? ''))) {
    throw error('contact-custom-field-values', 'field', 'A Contact can only have one value for the same custom field.', req)
  }

  return data
}
