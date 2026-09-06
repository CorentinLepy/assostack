import { GET as getLive } from '@/app/(payload)/api/health/live/route'
import { GET as getReady } from '@/app/(payload)/api/health/ready/route'
import { createReadinessResponse } from '@/health/responses'
import { describe, expect, test, vi } from 'vitest'

describe('operational health endpoints', () => {
  test('liveness is cheap, machine-readable, and non-cacheable', async () => {
    const response = await getLive()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  test('readiness succeeds when Payload can query PostgreSQL', async () => {
    const response = await getReady()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    await expect(response.json()).resolves.toEqual({ status: 'ready' })
  })

  test('readiness fails closed without exposing backend error details', async () => {
    const sensitiveMessage = 'postgresql://user:super-secret-password@database.internal/assostack'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    try {
      const response = await createReadinessResponse(async () => {
        throw new Error(sensitiveMessage)
      })

      expect(response.status).toBe(503)
      expect(response.headers.get('cache-control')).toContain('no-store')

      const body = await response.text()
      expect(JSON.parse(body)).toEqual({ status: 'unavailable' })
      expect(body).not.toContain(sensitiveMessage)

      expect(warn).toHaveBeenCalledTimes(1)
      const loggedLine = String(warn.mock.calls[0]?.[0] ?? '')
      const logEntry = JSON.parse(loggedLine)

      expect(logEntry.level).toBe('warn')
      expect(logEntry.event).toBe('health.readiness.failed')
      expect(logEntry.component).toBe('database')
      expect(loggedLine).not.toContain(sensitiveMessage)
    } finally {
      warn.mockRestore()
    }
  })
})
