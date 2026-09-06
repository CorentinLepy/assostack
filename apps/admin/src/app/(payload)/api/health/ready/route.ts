import { checkDatabaseReadiness } from '@/health/database'
import { createReadinessResponse } from '@/health/responses'

export const dynamic = 'force-dynamic'

export const GET = async (): Promise<Response> => createReadinessResponse(checkDatabaseReadiness)
