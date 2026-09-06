import { createLivenessResponse } from '@/health/responses'

export const dynamic = 'force-dynamic'

export const GET = async (): Promise<Response> => createLivenessResponse()
