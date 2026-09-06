import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from 'payload'

import { getRelationshipID } from '../access/organizations'
import {
  deliverSiteSyncRequest,
  type SiteSyncAction,
  type SiteSyncReason,
} from './webhook'

type PublicContentKind = 'page' | 'post'
type DocumentLike = Record<string, any>

type OrganizationContext = {
  publicSiteEnabled: boolean
  slug: string
}

const isPublished = (doc: unknown): boolean =>
  Boolean(doc && typeof doc === 'object' && (doc as DocumentLike)._status === 'published')

export const getPublicContentSiteSyncReason = ({
  current,
  kind,
  previous,
}: {
  current: unknown
  kind: PublicContentKind
  previous: unknown
}): SiteSyncReason | null => {
  const wasPublished = isPublished(previous)
  const isCurrentlyPublished = isPublished(current)

  if (!wasPublished && !isCurrentlyPublished) {
    return null
  }

  if (!wasPublished && isCurrentlyPublished) {
    return `${kind}.published`
  }

  if (wasPublished && !isCurrentlyPublished) {
    return `${kind}.unpublished`
  }

  return `${kind}.updated`
}

const resolveOrganizationContext = async (
  req: PayloadRequest,
  relationship: unknown,
): Promise<OrganizationContext | null> => {
  if (relationship && typeof relationship === 'object') {
    const populated = relationship as DocumentLike
    if (typeof populated.slug === 'string' && populated.slug.length > 0) {
      return {
        publicSiteEnabled:
          populated.status === 'active' && populated.settings?.website?.enabled !== false,
        slug: populated.slug,
      }
    }
  }

  const organizationID = getRelationshipID(relationship as any)
  if (organizationID === null) {
    return null
  }

  try {
    const organization = await req.payload.findByID({
      collection: 'organizations',
      id: organizationID,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (typeof organization.slug !== 'string' || organization.slug.length === 0) {
      return null
    }

    return {
      publicSiteEnabled:
        organization.status === 'active' && organization.settings?.website?.enabled !== false,
      slug: organization.slug,
    }
  } catch (error) {
    req.payload.logger.warn({
      err: error instanceof Error ? error.message : 'Unknown organization lookup error',
      msg: 'Could not resolve organization for site sync request.',
    })
    return null
  }
}

const requestContentSiteSync = async ({
  doc,
  kind,
  previousDoc,
  req,
}: {
  doc: DocumentLike
  kind: PublicContentKind
  previousDoc?: DocumentLike
  req: PayloadRequest
}) => {
  if (req.context.disableSiteSync) {
    return
  }

  const reason = getPublicContentSiteSyncReason({
    current: doc,
    kind,
    previous: previousDoc,
  })
  if (!reason) {
    return
  }

  const organization = await resolveOrganizationContext(req, doc.organization ?? previousDoc?.organization)
  if (!organization?.publicSiteEnabled) {
    return
  }

  await deliverSiteSyncRequest({
    action: 'rebuild',
    organizationSlug: organization.slug,
    reason,
    req,
  })
}

export const createPublicContentSiteSyncAfterChange = (
  kind: PublicContentKind,
): CollectionAfterChangeHook => {
  return async ({ doc, previousDoc, req }) => {
    await requestContentSiteSync({
      doc: doc as DocumentLike,
      kind,
      previousDoc: previousDoc as DocumentLike | undefined,
      req,
    })

    return doc
  }
}

export const createPublicContentSiteSyncAfterDelete = (
  kind: PublicContentKind,
): CollectionAfterDeleteHook => {
  return async ({ doc, req }) => {
    if (!req.context.disableSiteSync && isPublished(doc)) {
      const organization = await resolveOrganizationContext(req, (doc as DocumentLike).organization)
      if (organization?.publicSiteEnabled) {
        await deliverSiteSyncRequest({
          action: 'rebuild',
          organizationSlug: organization.slug,
          reason: `${kind}.deleted`,
          req,
        })
      }
    }

    return doc
  }
}

const publicOrganizationSnapshot = (doc: unknown) => {
  const value = doc && typeof doc === 'object' ? (doc as DocumentLike) : {}
  return JSON.stringify({
    name: value.name ?? null,
    slug: value.slug ?? null,
    status: value.status ?? null,
    locale: value.settings?.locale ?? null,
    timezone: value.settings?.timezone ?? null,
    publicContact: value.settings?.publicContact ?? null,
    website: value.settings?.website ?? null,
  })
}

const organizationSiteAction = (doc: DocumentLike): SiteSyncAction =>
  doc.status === 'active' && doc.settings?.website?.enabled !== false ? 'rebuild' : 'disable'

export const organizationSiteSyncAfterChange: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (
    operation !== 'update' ||
    req.context.disableSiteSync ||
    publicOrganizationSnapshot(doc) === publicOrganizationSnapshot(previousDoc)
  ) {
    return doc
  }

  const current = doc as DocumentLike
  const previous = (previousDoc ?? {}) as DocumentLike
  const currentSlug = typeof current.slug === 'string' ? current.slug : null
  const previousSlug = typeof previous.slug === 'string' ? previous.slug : null

  if (previousSlug && currentSlug && previousSlug !== currentSlug) {
    await deliverSiteSyncRequest({
      action: 'disable',
      organizationSlug: previousSlug,
      reason: 'organization.slug-changed',
      req,
    })
  }

  if (currentSlug) {
    const action = organizationSiteAction(current)
    await deliverSiteSyncRequest({
      action,
      organizationSlug: currentSlug,
      reason: action === 'disable' ? 'organization.disabled' : 'organization.updated',
      req,
    })
  }

  return doc
}

export const organizationSiteSyncAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (req.context.disableSiteSync) {
    return doc
  }

  const organization = (doc ?? {}) as DocumentLike
  if (typeof organization.slug === 'string' && organization.slug.length > 0) {
    await deliverSiteSyncRequest({
      action: 'disable',
      organizationSlug: organization.slug,
      reason: 'organization.deleted',
      req,
    })
  }

  return doc
}
