import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, FieldHook } from 'payload'

const normalizedText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const normalizeContactIdentity: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) {
    return data
  }

  const kind = data.kind === 'organization' ? 'organization' : 'person'
  data.kind = kind

  const currentDisplayName = normalizedText(data.displayName)
  if (currentDisplayName) {
    data.displayName = currentDisplayName
    return data
  }

  if (kind === 'organization') {
    const organizationName = normalizedText(data.organizationDetails?.name)
    const legalName = normalizedText(data.organizationDetails?.legalName)
    const derived = organizationName ?? legalName
    if (derived) {
      data.displayName = derived
    }
    return data
  }

  const firstName = normalizedText(data.person?.firstName)
  const lastName = normalizedText(data.person?.lastName)
  const derived = [firstName, lastName].filter(Boolean).join(' ')
  if (derived.length > 0) {
    data.displayName = derived
  }

  return data
}

export const maintainContactArchiveTimestamp: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) {
    return data
  }

  if (data.status === 'archived' && originalDoc?.status !== 'archived') {
    data.archivedAt = new Date().toISOString()
  } else if (data.status === 'active') {
    data.archivedAt = null
  }

  return data
}

export const normalizeCountryCode: FieldHook = ({ value }) => {
  if (typeof value !== 'string') {
    return value
  }

  const normalized = value.trim().toUpperCase()
  return normalized.length > 0 ? normalized : null
}

export const validateCountryCode = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') {
    return true
  }

  return typeof value === 'string' && /^[A-Z]{2}$/.test(value)
    ? true
    : 'Use a two-letter ISO 3166-1 alpha-2 country code, for example FR or BE.'
}
