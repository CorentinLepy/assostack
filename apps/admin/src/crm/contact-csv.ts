import type { Payload } from 'payload'

import { getRelationshipID, hasOrganizationRole, isPlatformAdmin, type RelationshipID } from '../access/organizations'

export const CONTACT_CSV_CORE_HEADERS = [
  'kind',
  'status',
  'displayName',
  'firstName',
  'lastName',
  'organizationName',
  'organizationLegalName',
  'registrationNumber',
  'website',
  'email',
  'phone',
  'addressLine1',
  'addressLine2',
  'postalCode',
  'city',
  'region',
  'countryCode',
  'externalReference',
] as const

const coreHeaders = new Set<string>(CONTACT_CSV_CORE_HEADERS)
const customPrefix = 'custom:'

type CustomFieldDefinition = {
  id: number | string
  key?: string | null
  label?: string | null
  type?: string | null
  status?: string | null
  required?: boolean | null
  sortOrder?: number | null
  options?: Array<{ label?: string | null; value?: string | null }> | null
}

type CsvError = {
  row: number
  column?: string
  message: string
}

type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

type ValidatedCustomValue = {
  field: CustomFieldDefinition
  data: Record<string, unknown>
}

type ValidatedRow = {
  row: number
  contact: Record<string, unknown>
  customValues: ValidatedCustomValue[]
}

export type ContactCsvImportResult = {
  dryRun: boolean
  totalRows: number
  validRows: number
  importedRows: number
  errors: CsvError[]
  contactIDs: Array<number | string>
}

export class ContactCsvAccessError extends Error {
  constructor(message = 'You do not have permission to import or export CRM Contacts for this organization.') {
    super(message)
    this.name = 'ContactCsvAccessError'
  }
}

const ensureStaffAccess = (user: unknown, organizationID: RelationshipID) => {
  if (
    !isPlatformAdmin(user) &&
    !hasOrganizationRole(user, organizationID, ['organization-admin', 'editor'])
  ) {
    throw new ContactCsvAccessError()
  }
}

const parseCsv = (input: string): ParsedCsv => {
  const source = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  const records: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      if (cell.length > 0) throw new Error('A quoted CSV field must start at the beginning of a cell.')
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      records.push(row)
      row = []
      cell = ''
    } else if (char === '\r') {
      if (source[index + 1] === '\n') index += 1
      row.push(cell)
      records.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (quoted) throw new Error('CSV input ends inside a quoted field.')
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    records.push(row)
  }

  while (records.length > 0 && records[records.length - 1].every((value) => value.trim() === '')) records.pop()
  if (records.length === 0) return { headers: [], rows: [] }
  return { headers: records[0].map((header) => header.trim()), rows: records.slice(1) }
}

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue
}

const serializeCsv = (rows: unknown[][]): string => `${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`

const fetchAll = async (payload: Payload, collection: any, where: any, sort?: string): Promise<any[]> => {
  const docs: any[] = []
  let page = 1
  do {
    const result = await payload.find({ collection, depth: 0, limit: 500, page, overrideAccess: true, sort, where } as any)
    docs.push(...result.docs)
    if (!result.hasNextPage) break
    page += 1
  } while (true)
  return docs
}

const getDefinitions = async (payload: Payload, organizationID: RelationshipID): Promise<CustomFieldDefinition[]> => {
  const definitions = await fetchAll(payload, 'custom-field-definitions', { organization: { equals: organizationID } }, 'sortOrder')
  return definitions
    .map((definition) => definition as CustomFieldDefinition)
    .filter((definition) => typeof definition.key === 'string' && definition.key.length > 0)
    .sort((left, right) => {
      const orderDiff = Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0)
      return orderDiff !== 0 ? orderDiff : String(left.key).localeCompare(String(right.key))
    })
}

const formatDateOnly = (value: unknown): string => {
  if (!value) return ''
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const customValueForExport = (definition: CustomFieldDefinition, value: any): string => {
  switch (definition.type) {
    case 'short-text':
    case 'long-text': return value?.textValue ?? ''
    case 'number': return value?.numberValue === null || value?.numberValue === undefined ? '' : String(value.numberValue)
    case 'boolean': return value?.booleanValue === null || value?.booleanValue === undefined ? '' : value.booleanValue ? 'true' : 'false'
    case 'date': return formatDateOnly(value?.dateValue)
    case 'single-select': return value?.singleSelectValue ?? ''
    case 'multi-select': return Array.isArray(value?.multiSelectValue) ? JSON.stringify(value.multiSelectValue) : ''
    default: return ''
  }
}

export const exportContactsCsv = async ({ payload, user, organizationID }: { payload: Payload; user: unknown; organizationID: RelationshipID }): Promise<string> => {
  ensureStaffAccess(user, organizationID)
  const [definitions, contacts, values] = await Promise.all([
    getDefinitions(payload, organizationID),
    fetchAll(payload, 'contacts', { organization: { equals: organizationID } }, 'id'),
    fetchAll(payload, 'contact-custom-field-values', { organization: { equals: organizationID } }),
  ])

  const byContactAndField = new Map<string, any>()
  for (const value of values) {
    const contactID = getRelationshipID(value.contact as any)
    const fieldID = getRelationshipID(value.field as any)
    if (contactID !== null && fieldID !== null) byContactAndField.set(`${String(contactID)}:${String(fieldID)}`, value)
  }

  const rows: unknown[][] = [[...CONTACT_CSV_CORE_HEADERS, ...definitions.map((definition) => `${customPrefix}${definition.key}`)]]
  for (const contact of contacts) {
    const core = [
      contact.kind ?? '', contact.status ?? '', contact.displayName ?? '', contact.person?.firstName ?? '', contact.person?.lastName ?? '',
      contact.organizationDetails?.name ?? '', contact.organizationDetails?.legalName ?? '', contact.organizationDetails?.registrationNumber ?? '',
      contact.organizationDetails?.website ?? '', contact.email ?? '', contact.phone ?? '', contact.address?.line1 ?? '', contact.address?.line2 ?? '',
      contact.address?.postalCode ?? '', contact.address?.city ?? '', contact.address?.region ?? '', contact.address?.countryCode ?? '', contact.externalReference ?? '',
    ]
    const custom = definitions.map((definition) => customValueForExport(definition, byContactAndField.get(`${String(contact.id)}:${String(definition.id)}`)))
    rows.push([...core, ...custom])
  }
  return serializeCsv(rows)
}

const validateHeaders = (headers: string[], definitions: CustomFieldDefinition[]): CsvError[] => {
  const errors: CsvError[] = []
  const seen = new Set<string>()
  const definitionsByKey = new Map(definitions.map((definition) => [String(definition.key), definition]))
  headers.forEach((header) => {
    if (!header) { errors.push({ row: 1, message: 'CSV headers cannot be empty.' }); return }
    if (seen.has(header)) { errors.push({ row: 1, column: header, message: `Duplicate CSV header: ${header}.` }); return }
    seen.add(header)
    if (coreHeaders.has(header)) return
    if (header.startsWith(customPrefix)) {
      const key = header.slice(customPrefix.length)
      const definition = definitionsByKey.get(key)
      if (!definition) errors.push({ row: 1, column: header, message: `Unknown custom field key: ${key}.` })
      else if (definition.status === 'archived') errors.push({ row: 1, column: header, message: `Custom field ${key} is archived and cannot receive new imported values.` })
      return
    }
    errors.push({ row: 1, column: header, message: `Unsupported CSV header: ${header}.` })
  })
  return errors
}

const cellMap = (headers: string[], row: string[]): Map<string, string> => new Map(headers.map((header, index) => [header, row[index]?.trim() ?? '']))

const parseBoolean = (value: string): boolean | null => {
  switch (value.trim().toLowerCase()) {
    case 'true': case '1': case 'yes': return true
    case 'false': case '0': case 'no': return false
    default: return null
  }
}

const validateCustomCell = (definition: CustomFieldDefinition, rawValue: string, row: number): { value?: ValidatedCustomValue; error?: CsvError } => {
  const column = `${customPrefix}${definition.key}`
  if (rawValue === '') return {}
  switch (definition.type) {
    case 'short-text': case 'long-text': return { value: { field: definition, data: { textValue: rawValue } } }
    case 'number': {
      const number = Number(rawValue)
      return Number.isFinite(number) ? { value: { field: definition, data: { numberValue: number } } } : { error: { row, column, message: `Expected a finite number for ${definition.key}.` } }
    }
    case 'boolean': {
      const boolean = parseBoolean(rawValue)
      return boolean === null ? { error: { row, column, message: `Expected true/false, 1/0 or yes/no for ${definition.key}.` } } : { value: { field: definition, data: { booleanValue: boolean } } }
    }
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return { error: { row, column, message: `Expected an ISO date (YYYY-MM-DD) for ${definition.key}.` } }
      const date = new Date(`${rawValue}T00:00:00.000Z`)
      return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== rawValue ? { error: { row, column, message: `Invalid calendar date for ${definition.key}.` } } : { value: { field: definition, data: { dateValue: date.toISOString() } } }
    }
    case 'single-select': {
      const allowed = new Set((definition.options ?? []).map((option) => String(option.value ?? '')))
      return allowed.has(rawValue) ? { value: { field: definition, data: { singleSelectValue: rawValue } } } : { error: { row, column, message: `Value is not an allowed option for ${definition.key}.` } }
    }
    case 'multi-select': {
      let selected: unknown
      try { selected = JSON.parse(rawValue) } catch { return { error: { row, column, message: `Expected a JSON string array for ${definition.key}.` } } }
      if (!Array.isArray(selected) || selected.some((item) => typeof item !== 'string')) return { error: { row, column, message: `Expected a JSON string array for ${definition.key}.` } }
      const allowed = new Set((definition.options ?? []).map((option) => String(option.value ?? '')))
      if (selected.some((item) => !allowed.has(String(item)))) return { error: { row, column, message: `One or more values are not allowed for ${definition.key}.` } }
      return { value: { field: definition, data: { multiSelectValue: selected } } }
    }
    default: return { error: { row, column, message: `Unsupported custom field type ${String(definition.type)}.` } }
  }
}

const validateRow = (headers: string[], values: string[], definitions: CustomFieldDefinition[], rowNumber: number): { row?: ValidatedRow; errors: CsvError[] } => {
  const errors: CsvError[] = []
  if (values.length > headers.length) return { errors: [{ row: rowNumber, message: `Row has ${values.length} cells but the header has ${headers.length}.` }] }
  const cells = cellMap(headers, values)
  const kind = cells.get('kind') || 'person'
  const status = cells.get('status') || 'active'
  if (!['person', 'organization'].includes(kind)) errors.push({ row: rowNumber, column: 'kind', message: 'kind must be person or organization.' })
  if (!['active', 'archived'].includes(status)) errors.push({ row: rowNumber, column: 'status', message: 'status must be active or archived.' })

  const countryCode = cells.get('countryCode') ?? ''
  if (countryCode && !/^[A-Za-z]{2}$/.test(countryCode)) errors.push({ row: rowNumber, column: 'countryCode', message: 'countryCode must be a two-letter ISO country code.' })
  const email = cells.get('email') ?? ''
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ row: rowNumber, column: 'email', message: 'email is not a valid email address.' })

  const displayName = cells.get('displayName') ?? ''
  const firstName = cells.get('firstName') ?? ''
  const lastName = cells.get('lastName') ?? ''
  const organizationName = cells.get('organizationName') ?? ''
  const organizationLegalName = cells.get('organizationLegalName') ?? ''
  if (!displayName && kind === 'person' && !firstName && !lastName) errors.push({ row: rowNumber, column: 'displayName', message: 'A person needs displayName, firstName or lastName.' })
  if (!displayName && kind === 'organization' && !organizationName && !organizationLegalName) errors.push({ row: rowNumber, column: 'displayName', message: 'An organization needs displayName, organizationName or organizationLegalName.' })

  const definitionsByKey = new Map(definitions.map((definition) => [String(definition.key), definition]))
  const customValues: ValidatedCustomValue[] = []
  for (const header of headers.filter((header) => header.startsWith(customPrefix))) {
    const definition = definitionsByKey.get(header.slice(customPrefix.length))
    if (!definition) continue
    const result = validateCustomCell(definition, cells.get(header) ?? '', rowNumber)
    if (result.error) errors.push(result.error)
    if (result.value) customValues.push(result.value)
  }
  for (const definition of definitions.filter((definition) => definition.status !== 'archived' && definition.required)) {
    const header = `${customPrefix}${definition.key}`
    if ((cells.get(header) ?? '') === '') errors.push({ row: rowNumber, column: header, message: `Required custom field ${definition.key} is missing.` })
  }
  if (errors.length > 0) return { errors }

  const contact: Record<string, unknown> = {
    kind, status,
    ...(displayName ? { displayName } : {}),
    ...(firstName || lastName ? { person: { ...(firstName ? { firstName } : {}), ...(lastName ? { lastName } : {}) } } : {}),
    ...(organizationName || organizationLegalName || cells.get('registrationNumber') || cells.get('website') ? { organizationDetails: { ...(organizationName ? { name: organizationName } : {}), ...(organizationLegalName ? { legalName: organizationLegalName } : {}), ...(cells.get('registrationNumber') ? { registrationNumber: cells.get('registrationNumber') } : {}), ...(cells.get('website') ? { website: cells.get('website') } : {}) } } : {}),
    ...(email ? { email } : {}), ...(cells.get('phone') ? { phone: cells.get('phone') } : {}),
    ...(cells.get('addressLine1') || cells.get('addressLine2') || cells.get('postalCode') || cells.get('city') || cells.get('region') || countryCode ? { address: { ...(cells.get('addressLine1') ? { line1: cells.get('addressLine1') } : {}), ...(cells.get('addressLine2') ? { line2: cells.get('addressLine2') } : {}), ...(cells.get('postalCode') ? { postalCode: cells.get('postalCode') } : {}), ...(cells.get('city') ? { city: cells.get('city') } : {}), ...(cells.get('region') ? { region: cells.get('region') } : {}), ...(countryCode ? { countryCode: countryCode.toUpperCase() } : {}) } } : {}),
    ...(cells.get('externalReference') ? { externalReference: cells.get('externalReference') } : {}),
  }
  return { row: { row: rowNumber, contact, customValues }, errors }
}

export const importContactsCsv = async ({ payload, user, organizationID, csv, dryRun = true }: { payload: Payload; user: unknown; organizationID: RelationshipID; csv: string; dryRun?: boolean }): Promise<ContactCsvImportResult> => {
  ensureStaffAccess(user, organizationID)
  let parsed: ParsedCsv
  try { parsed = parseCsv(csv) } catch (cause) {
    return { dryRun, totalRows: 0, validRows: 0, importedRows: 0, errors: [{ row: 1, message: cause instanceof Error ? cause.message : 'Invalid CSV input.' }], contactIDs: [] }
  }
  if (parsed.headers.length === 0) return { dryRun, totalRows: 0, validRows: 0, importedRows: 0, errors: [{ row: 1, message: 'CSV input must include a header row.' }], contactIDs: [] }

  const definitions = await getDefinitions(payload, organizationID)
  const headerErrors = validateHeaders(parsed.headers, definitions)
  if (headerErrors.length > 0) return { dryRun, totalRows: parsed.rows.length, validRows: 0, importedRows: 0, errors: headerErrors, contactIDs: [] }

  const validRows: ValidatedRow[] = []
  const errors: CsvError[] = []
  parsed.rows.forEach((row, index) => {
    if (row.every((cell) => cell.trim() === '')) return
    const result = validateRow(parsed.headers, row, definitions, index + 2)
    errors.push(...result.errors)
    if (result.row) validRows.push(result.row)
  })
  const totalRows = validRows.length + new Set(errors.filter((error) => error.row > 1).map((error) => error.row)).size
  if (dryRun || errors.length > 0) return { dryRun, totalRows, validRows: validRows.length, importedRows: 0, errors, contactIDs: [] }

  const contactIDs: Array<number | string> = []
  for (const row of validRows) {
    let contact: any = null
    const createdValueIDs: Array<number | string> = []
    try {
      contact = await payload.create({ collection: 'contacts', overrideAccess: false, user: user as any, data: { ...row.contact, organization: organizationID } as any })
      for (const customValue of row.customValues) {
        const created = await payload.create({ collection: 'contact-custom-field-values', overrideAccess: false, user: user as any, data: { organization: organizationID, contact: contact.id, field: customValue.field.id, ...customValue.data } as any })
        createdValueIDs.push(created.id)
      }
      contactIDs.push(contact.id)
    } catch (cause) {
      for (const id of createdValueIDs.reverse()) await payload.delete({ collection: 'contact-custom-field-values', id, overrideAccess: true }).catch(() => undefined)
      if (contact?.id !== undefined) await payload.delete({ collection: 'contacts', id: contact.id, overrideAccess: true }).catch(() => undefined)
      errors.push({ row: row.row, message: cause instanceof Error ? cause.message : 'Unexpected error while importing this row.' })
    }
  }
  return { dryRun, totalRows, validRows: validRows.length, importedRows: contactIDs.length, errors, contactIDs }
}
