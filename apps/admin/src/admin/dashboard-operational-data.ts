import { getTenantFromCookie } from '@payloadcms/plugin-multi-tenant/utilities'
import type { PayloadRequest, SanitizedPermissions } from 'payload'

import { canReadCollectionFromPermissions, isModuleEnabled } from './module-policy'
import type { OrganizationModules } from './modules'

export type UpcomingEventSummary = {
  id: number | string
  title: string
  startsAt: string
}

export type MembershipRenewalSummary = {
  id: number | string
  contactName: string
  endsAt: string
}

export type OpenTaskSummary = {
  id: number | string
  title: string
  dueAt?: string | null
}

export type RecentActivitySummary = {
  id: number | string
  subject: string
  occurredAt: string
}

export type DashboardOperationalData = {
  organizationId: number | string | undefined
  upcomingEvents: UpcomingEventSummary[]
  membershipRenewals: MembershipRenewalSummary[]
  openTasks: OpenTaskSummary[]
  recentActivity: RecentActivitySummary[]
}

const emptyOperationalData: DashboardOperationalData = {
  organizationId: undefined,
  upcomingEvents: [],
  membershipRenewals: [],
  openTasks: [],
  recentActivity: [],
}

/**
 * Loads only real, tenant-scoped operational data for the dashboard.
 * Every query is gated by module enablement and Payload permissions,
 * and enforces access control via `overrideAccess: false`.
 */
export const loadDashboardOperationalData = async (
  req: PayloadRequest,
  permissions: SanitizedPermissions | undefined,
): Promise<DashboardOperationalData> => {
  const organizationId = getTenantFromCookie(req.headers, 'number') ?? undefined

  if (!organizationId) {
    return emptyOperationalData
  }

  let modules: Partial<OrganizationModules> | undefined

  try {
    const organization = await req.payload.findByID({
      collection: 'organizations',
      id: organizationId,
      depth: 0,
      overrideAccess: false,
      user: req.user,
    })
    modules = organization.settings?.modules as Partial<OrganizationModules> | undefined
  } catch {
    return { ...emptyOperationalData, organizationId }
  }

  const now = new Date()
  const renewalWindowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [upcomingEvents, membershipRenewals, openTasks, recentActivity] = await Promise.all([
    isModuleEnabled(modules, 'events') && canReadCollectionFromPermissions(permissions, 'events')
      ? req.payload
          .find({
            collection: 'events',
            depth: 0,
            limit: 4,
            overrideAccess: false,
            sort: 'startsAt',
            user: req.user,
            where: {
              and: [
                { organization: { equals: organizationId } },
                { status: { equals: 'scheduled' } },
                { startsAt: { greater_than_equal: now.toISOString() } },
              ],
            },
          })
          .then((result) =>
            result.docs.map((doc) => ({ id: doc.id, title: doc.title, startsAt: doc.startsAt })),
          )
          .catch(() => [] as UpcomingEventSummary[])
      : Promise.resolve([] as UpcomingEventSummary[]),

    isModuleEnabled(modules, 'memberships') &&
    canReadCollectionFromPermissions(permissions, 'memberships')
      ? req.payload
          .find({
            collection: 'memberships',
            depth: 1,
            limit: 4,
            overrideAccess: false,
            sort: 'endsAt',
            user: req.user,
            where: {
              and: [
                { organization: { equals: organizationId } },
                { status: { equals: 'active' } },
                { endsAt: { greater_than_equal: now.toISOString() } },
                { endsAt: { less_than_equal: renewalWindowEnd.toISOString() } },
              ],
            },
          })
          .then((result) =>
            result.docs.map((doc) => ({
              id: doc.id,
              contactName:
                (typeof doc.contact === 'object' ? doc.contact?.displayName : undefined) ??
                'Contact',
              endsAt: doc.endsAt as string,
            })),
          )
          .catch(() => [] as MembershipRenewalSummary[])
      : Promise.resolve([] as MembershipRenewalSummary[]),

    canReadCollectionFromPermissions(permissions, 'tasks')
      ? req.payload
          .find({
            collection: 'tasks',
            depth: 0,
            limit: 4,
            overrideAccess: false,
            sort: 'dueAt',
            user: req.user,
            where: {
              and: [
                { organization: { equals: organizationId } },
                { status: { in: ['open', 'in-progress'] } },
              ],
            },
          })
          .then((result) =>
            result.docs.map((doc) => ({ id: doc.id, title: doc.title, dueAt: doc.dueAt })),
          )
          .catch(() => [] as OpenTaskSummary[])
      : Promise.resolve([] as OpenTaskSummary[]),

    canReadCollectionFromPermissions(permissions, 'interactions')
      ? req.payload
          .find({
            collection: 'interactions',
            depth: 0,
            limit: 4,
            overrideAccess: false,
            sort: '-occurredAt',
            user: req.user,
            where: { organization: { equals: organizationId } },
          })
          .then((result) =>
            result.docs.map((doc) => ({
              id: doc.id,
              subject: doc.subject,
              occurredAt: doc.occurredAt,
            })),
          )
          .catch(() => [] as RecentActivitySummary[])
      : Promise.resolve([] as RecentActivitySummary[]),
  ])

  return { organizationId, upcomingEvents, membershipRenewals, openTasks, recentActivity }
}
