import type { AdminViewServerProps } from 'payload'

import { AssociationDashboard } from './AssociationDashboard'
import { loadDashboardOperationalData } from './dashboard-operational-data'

/**
 * Server wrapper so operational sections can use the Payload Local API
 * with real access control (`overrideAccess: false`) instead of client fetches.
 */
export const AssociationDashboardServer = async ({
  initPageResult,
  permissions,
}: AdminViewServerProps) => {
  const effectivePermissions = permissions ?? initPageResult.permissions
  const operational = await loadDashboardOperationalData(initPageResult.req, effectivePermissions)

  return <AssociationDashboard operational={operational} permissions={effectivePermissions} />
}
