import { describe, expect, test, vi } from 'vitest'
import type { PayloadRequest } from 'payload'

import { loadDashboardOperationalData } from '@/admin/dashboard-operational-data'

describe('dashboard operational data', () => {
  test('returns empty, no-query data when no organization is selected', async () => {
    const find = vi.fn()
    const findByID = vi.fn()
    const req = {
      headers: new Headers(),
      payload: { find, findByID },
      user: undefined,
    } as unknown as PayloadRequest

    const data = await loadDashboardOperationalData(req, undefined)

    expect(data).toEqual({
      organizationId: undefined,
      upcomingEvents: [],
      membershipRenewals: [],
      openTasks: [],
      recentActivity: [],
    })
    expect(find).not.toHaveBeenCalled()
    expect(findByID).not.toHaveBeenCalled()
  })

  test('skips module- or permission-gated queries but still enforces overrideAccess: false when it does query', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const findByID = vi.fn().mockResolvedValue({
      settings: { modules: { enabled: [] } },
    })
    const req = {
      headers: new Headers({ cookie: 'payload-tenant=1' }),
      payload: { find, findByID },
      user: { id: 1 },
    } as unknown as PayloadRequest

    const data = await loadDashboardOperationalData(req, {
      collections: { tasks: { read: true }, interactions: { read: true } },
    } as any)

    expect(data.organizationId).toBe(1)
    // events/memberships are optional modules and none are enabled, so they must not be queried
    expect(find).not.toHaveBeenCalledWith(expect.objectContaining({ collection: 'events' }))
    expect(find).not.toHaveBeenCalledWith(expect.objectContaining({ collection: 'memberships' }))
    // tasks/interactions are permitted, so they are queried with overrideAccess: false
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'tasks', overrideAccess: false }),
    )
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'interactions', overrideAccess: false }),
    )
  })
})
