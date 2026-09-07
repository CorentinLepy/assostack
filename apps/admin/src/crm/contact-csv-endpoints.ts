import type { Endpoint, PayloadRequest } from 'payload'

import { ContactCsvAccessError, exportContactsCsv, importContactsCsv } from './contact-csv'

const routeParam = (req: PayloadRequest, name: string): string | null => {
  const value = req.routeParams?.[name]
  return typeof value === 'string' && value.length > 0 ? value : null
}

const jsonError = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } })

const requireUser = (req: PayloadRequest) => {
  if (!req.user) throw new ContactCsvAccessError('Authentication is required.')
  return req.user
}

export const contactCsvExportEndpoint: Endpoint = {
  path: '/crm/v1/organizations/:organization/contacts.csv',
  method: 'get',
  handler: async (req) => {
    const organizationID = routeParam(req, 'organization')
    if (!organizationID) return jsonError(400, 'invalid_request', 'Organization ID is required.')

    try {
      const csv = await exportContactsCsv({ payload: req.payload, user: requireUser(req), organizationID })
      return new Response(csv, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Disposition': 'attachment; filename="contacts.csv"',
          'Content-Type': 'text/csv; charset=utf-8',
        },
      })
    } catch (cause) {
      if (cause instanceof ContactCsvAccessError) {
        return jsonError(req.user ? 403 : 401, req.user ? 'forbidden' : 'unauthorized', cause.message)
      }
      req.payload.logger.error({ err: cause }, 'CRM Contact CSV export failed')
      return jsonError(500, 'export_failed', 'CRM Contact export failed.')
    }
  },
}

export const contactCsvImportEndpoint: Endpoint = {
  path: '/crm/v1/organizations/:organization/contacts/import',
  method: 'post',
  handler: async (req) => {
    const organizationID = routeParam(req, 'organization')
    if (!organizationID) return jsonError(400, 'invalid_request', 'Organization ID is required.')

    try {
      const user = requireUser(req)
      let body: unknown
      try {
        body = await req.json?.()
      } catch {
        return jsonError(400, 'invalid_json', 'Request body must be valid JSON.')
      }

      if (!body || typeof body !== 'object' || typeof (body as any).csv !== 'string') {
        return jsonError(400, 'invalid_request', 'Request body must include a UTF-8 CSV string in the csv property.')
      }

      const dryRun = (body as any).dryRun === undefined ? true : (body as any).dryRun
      if (typeof dryRun !== 'boolean') {
        return jsonError(400, 'invalid_request', 'dryRun must be a boolean when provided.')
      }

      const result = await importContactsCsv({
        payload: req.payload,
        user,
        organizationID,
        csv: (body as any).csv,
        dryRun,
      })

      return Response.json(result, { status: result.errors.length > 0 ? 422 : 200, headers: { 'Cache-Control': 'no-store' } })
    } catch (cause) {
      if (cause instanceof ContactCsvAccessError) {
        return jsonError(req.user ? 403 : 401, req.user ? 'forbidden' : 'unauthorized', cause.message)
      }
      req.payload.logger.error({ err: cause }, 'CRM Contact CSV import failed')
      return jsonError(500, 'import_failed', 'CRM Contact import failed.')
    }
  },
}

export const contactCsvEndpoints: Endpoint[] = [contactCsvExportEndpoint, contactCsvImportEndpoint]
