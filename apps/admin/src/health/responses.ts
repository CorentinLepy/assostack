import { logOperationalEvent } from '../observability/log'

const healthHeaders = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
} as const

export const createLivenessResponse = (): Response =>
  Response.json(
    {
      status: 'ok',
    },
    {
      status: 200,
      headers: healthHeaders,
    },
  )

export const createReadinessResponse = async (check: () => Promise<void>): Promise<Response> => {
  try {
    await check()

    return Response.json(
      {
        status: 'ready',
      },
      {
        status: 200,
        headers: healthHeaders,
      },
    )
  } catch {
    logOperationalEvent('warn', 'health.readiness.failed', {
      component: 'database',
    })

    return Response.json(
      {
        status: 'unavailable',
      },
      {
        status: 503,
        headers: healthHeaders,
      },
    )
  }
}
