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
type FormField = {
  key?: string | null
  label?: string | null
  type?: string | null
  required?: boolean | null
  options?: Array<{ label?: string | null; value?: string | null }> | null
}

const normalizeKey = (input: string): string =>
  input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const validationError = ({ collection, message, path, req }: { collection: 'forms' | 'form-submissions'; message: string; path: string; req: PayloadRequest }) =>
  new ValidationError({ collection, errors: [{ message, path }], req })

const valueFromUpdate = (current: DocumentLike, previous: DocumentLike, field: string): unknown =>
  Object.prototype.hasOwnProperty.call(current, field) ? current[field] : previous[field]

const sameRelationshipID = (left: unknown, right: RelationshipID): boolean => {
  const leftID = getRelationshipID(left as any)
  return leftID !== null && String(leftID) === String(right)
}

export const normalizeFormDefinition: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (!data) return data
  const source = typeof data.key === 'string' && data.key.trim().length > 0 ? data.key : typeof originalDoc?.key === 'string' && originalDoc.key.trim().length > 0 ? originalDoc.key : typeof data.title === 'string' ? data.title : null
  if (!source) throw validationError({ collection: 'forms', message: 'A form requires a title or key.', path: 'key', req })
  const key = normalizeKey(source)
  if (!key) throw validationError({ collection: 'forms', message: 'The form key must contain at least one letter or number.', path: 'key', req })
  data.key = key

  if (Array.isArray(data.fields)) {
    const seen = new Set<string>()
    data.fields = data.fields.map((field: FormField, index: number) => {
      const normalizedFieldKey = normalizeKey(String(field?.key ?? field?.label ?? ''))
      if (!normalizedFieldKey) throw validationError({ collection: 'forms', message: 'Every form field requires a stable key or label.', path: `fields.${index}.key`, req })
      if (seen.has(normalizedFieldKey)) throw validationError({ collection: 'forms', message: `Duplicate form field key: ${normalizedFieldKey}.`, path: `fields.${index}.key`, req })
      seen.add(normalizedFieldKey)
      const options = Array.isArray(field.options) ? field.options : []
      if (field.type === 'single-select' || field.type === 'multi-select') {
        if (options.length === 0) throw validationError({ collection: 'forms', message: 'Select fields require at least one option.', path: `fields.${index}.options`, req })
        const optionValues = new Set<string>()
        for (const option of options) {
          const optionValue = String(option?.value ?? '').trim()
          if (!optionValue || optionValues.has(optionValue)) throw validationError({ collection: 'forms', message: 'Select option values must be non-empty and unique within the field.', path: `fields.${index}.options`, req })
          optionValues.add(optionValue)
        }
      } else if (options.length > 0) {
        throw validationError({ collection: 'forms', message: 'Options are only supported by single-select and multi-select fields.', path: `fields.${index}.options`, req })
      }
      return { ...field, key: normalizedFieldKey }
    })
  }
  return data
}

export const ensureFormKeyUnique: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)
  const key = data.key ?? originalDoc?.key
  if (organizationID === null || typeof key !== 'string' || key.length === 0) return data
  const constraints: Where[] = [{ organization: { equals: organizationID } }, { key: { equals: key } }]
  if (originalDoc?.id !== undefined && originalDoc?.id !== null) constraints.push({ id: { not_equals: originalDoc.id } })
  const duplicate = await req.payload.find({ collection: 'forms', depth: 0, limit: 1, overrideAccess: true, req, where: { and: constraints } })
  if (duplicate.totalDocs > 0) throw validationError({ collection: 'forms', message: 'This form key is already used in the same organization.', path: 'key', req })
  return data
}

export const preventFormSchemaChangeWhenSubmitted: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (operation !== 'update' || !originalDoc?.id || !Object.prototype.hasOwnProperty.call(data, 'fields')) return data
  const submission = await req.payload.find({ collection: 'form-submissions', depth: 0, limit: 1, overrideAccess: true, req, where: { form: { equals: originalDoc.id } } })
  if (submission.totalDocs > 0 && JSON.stringify(data.fields) !== JSON.stringify(originalDoc.fields ?? [])) {
    throw validationError({ collection: 'forms', message: 'A form schema cannot be changed after submissions exist. Archive it and create a new form version instead.', path: 'fields', req })
  }
  return data
}

export const preventFormDeleteWhenSubmitted: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const submission = await req.payload.find({ collection: 'form-submissions', depth: 0, limit: 1, overrideAccess: true, req, where: { form: { equals: id } } })
  if (submission.totalDocs > 0) throw validationError({ collection: 'forms', message: 'Forms with submission history cannot be deleted. Archive the form instead.', path: 'id', req })
}

const assertTenantRelationship = async ({ collection, id, organizationID, path, req }: { collection: 'forms' | 'contacts'; id: RelationshipID; organizationID: RelationshipID; path: 'form' | 'contact'; req: PayloadRequest }) => {
  try {
    const record = await req.payload.findByID({ collection, id, depth: 0, overrideAccess: true, req })
    if (!sameRelationshipID((record as DocumentLike).organization, organizationID)) throw new Error('cross-tenant')
    return record as DocumentLike
  } catch {
    throw validationError({ collection: 'form-submissions', message: `The ${path === 'form' ? 'Form' : 'Contact'} must belong to the same organization as the submission.`, path, req })
  }
}

const validateSubmissionValue = ({ field, value, row, req }: { field: FormField; value: DocumentLike | undefined; row: number; req: PayloadRequest }) => {
  const path = `values.${row}`
  if (!value) {
    if (field.required) throw validationError({ collection: 'form-submissions', message: `Required field ${String(field.key)} is missing.`, path: 'values', req })
    return null
  }
  const base = { fieldKey: field.key, fieldLabel: field.label, fieldType: field.type, textValue: null, numberValue: null, booleanValue: null, dateValue: null, singleSelectValue: null, multiSelectValue: [] } as DocumentLike
  const populated = [
    value.textValue !== null && value.textValue !== undefined && value.textValue !== '',
    value.numberValue !== null && value.numberValue !== undefined,
    value.booleanValue !== null && value.booleanValue !== undefined,
    value.dateValue !== null && value.dateValue !== undefined && value.dateValue !== '',
    value.singleSelectValue !== null && value.singleSelectValue !== undefined && value.singleSelectValue !== '',
    Array.isArray(value.multiSelectValue) && value.multiSelectValue.length > 0,
  ].filter(Boolean).length
  if (populated === 0) {
    if (field.required) throw validationError({ collection: 'form-submissions', message: `Required field ${String(field.key)} is empty.`, path, req })
    return null
  }
  if (populated !== 1) throw validationError({ collection: 'form-submissions', message: `Exactly one typed value must be provided for ${String(field.key)}.`, path, req })
  switch (field.type) {
    case 'short-text':
    case 'long-text':
    case 'email': {
      if (typeof value.textValue !== 'string' || value.textValue.trim().length === 0) throw validationError({ collection: 'form-submissions', message: 'Expected a text value.', path, req })
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.textValue.trim())) throw validationError({ collection: 'form-submissions', message: 'Expected a valid email address.', path, req })
      base.textValue = value.textValue
      break
    }
    case 'number':
      if (typeof value.numberValue !== 'number' || !Number.isFinite(value.numberValue)) throw validationError({ collection: 'form-submissions', message: 'Expected a finite number.', path, req })
      base.numberValue = value.numberValue
      break
    case 'boolean':
      if (typeof value.booleanValue !== 'boolean') throw validationError({ collection: 'form-submissions', message: 'Expected a boolean value.', path, req })
      base.booleanValue = value.booleanValue
      break
    case 'date': {
      const timestamp = Date.parse(String(value.dateValue ?? ''))
      if (!Number.isFinite(timestamp)) throw validationError({ collection: 'form-submissions', message: 'Expected a valid date.', path, req })
      base.dateValue = new Date(timestamp).toISOString()
      break
    }
    case 'single-select': {
      const allowed = new Set((field.options ?? []).map((option) => String(option.value ?? '')))
      if (typeof value.singleSelectValue !== 'string' || !allowed.has(value.singleSelectValue)) throw validationError({ collection: 'form-submissions', message: 'Value is not an allowed select option.', path, req })
      base.singleSelectValue = value.singleSelectValue
      break
    }
    case 'multi-select': {
      const selected = value.multiSelectValue
      const allowed = new Set((field.options ?? []).map((option) => String(option.value ?? '')))
      if (!Array.isArray(selected) || selected.some((item) => typeof item !== 'string' || !allowed.has(item))) throw validationError({ collection: 'form-submissions', message: 'One or more values are not allowed select options.', path, req })
      base.multiSelectValue = selected
      break
    }
    default:
      throw validationError({ collection: 'form-submissions', message: 'Unsupported form field type.', path, req })
  }
  return base
}

export const validateFormSubmission: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  const current = (data ?? {}) as DocumentLike
  const previous = (originalDoc ?? {}) as DocumentLike
  const organizationID = getRelationshipID(current.organization ?? previous.organization)
  const formID = getRelationshipID((operation === 'update' ? previous.form : valueFromUpdate(current, previous, 'form')) as any)
  const contactID = getRelationshipID((operation === 'update' ? previous.contact : valueFromUpdate(current, previous, 'contact')) as any)

  if (organizationID === null || formID === null) throw validationError({ collection: 'form-submissions', message: 'A submission requires an organization and Form.', path: formID === null ? 'form' : 'organization', req })
  const form = await assertTenantRelationship({ collection: 'forms', id: formID, organizationID, path: 'form', req })
  if (contactID !== null) await assertTenantRelationship({ collection: 'contacts', id: contactID, organizationID, path: 'contact', req })

  if (operation === 'create') {
    if (form.status !== 'active') throw validationError({ collection: 'form-submissions', message: 'New submissions can only target an active Form.', path: 'form', req })
    const suppliedValues = Array.isArray(current.values) ? current.values : []
    const byKey = new Map<string, DocumentLike>()
    for (const value of suppliedValues) {
      const key = String(value?.fieldKey ?? '').trim()
      if (!key || byKey.has(key)) throw validationError({ collection: 'form-submissions', message: 'Submission field keys must be present and unique.', path: 'values', req })
      byKey.set(key, value)
    }
    const formFields = Array.isArray(form.fields) ? (form.fields as FormField[]) : []
    for (const suppliedKey of byKey.keys()) {
      if (!formFields.some((field) => field.key === suppliedKey)) throw validationError({ collection: 'form-submissions', message: `Unknown form field key: ${suppliedKey}.`, path: 'values', req })
    }
    current.values = formFields.map((field, index) => validateSubmissionValue({ field, value: byKey.get(String(field.key)), row: index, req })).filter(Boolean)
    current.submittedAt = new Date().toISOString()
    current.createdBy = req.user?.id ?? null
  } else {
    current.form = formID
    current.contact = contactID
    current.values = previous.values
    current.submittedAt = previous.submittedAt
    current.source = previous.source
    current.createdBy = getRelationshipID(previous.createdBy as any)
  }
  return current
}
