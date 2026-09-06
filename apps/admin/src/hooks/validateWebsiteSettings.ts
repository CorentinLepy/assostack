import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID } from '../access/organizations'
import { isBuiltInPublicRoute } from '../cms/public-routes'

const isSafeExternalURL = (value: unknown): boolean => {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const validationError = (path: string, message: string) =>
  new ValidationError({
    errors: [
      {
        message,
        path,
      },
    ],
  })

const assertTenantRelationship = async ({
  collection,
  organizationID,
  path,
  req,
  value,
}: {
  collection: 'media' | 'pages'
  organizationID: number | string
  path: string
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
  value: unknown
}) => {
  const relationshipID = getRelationshipID(value as any)
  if (relationshipID === null) {
    throw validationError(path, 'A valid organization-owned resource is required.')
  }

  let related: any
  try {
    related = await req.payload.findByID({
      collection,
      id: relationshipID,
      depth: 0,
      overrideAccess: true,
      req,
    })
  } catch {
    throw validationError(path, 'The selected resource does not exist.')
  }

  const relatedOrganizationID = getRelationshipID(related?.organization)
  if (
    relatedOrganizationID === null ||
    String(relatedOrganizationID) !== String(organizationID)
  ) {
    throw validationError(path, 'The selected resource must belong to the same organization.')
  }
}

/**
 * Organization settings live on the tenant record itself, so Payload's
 * multi-tenant collection plugin cannot protect nested page/media relationships
 * for us. This hook closes that boundary at write time.
 */
export const validateWebsiteSettings: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update') {
    return data
  }

  const organizationID = originalDoc?.id
  if (typeof organizationID !== 'number' && typeof organizationID !== 'string') {
    return data
  }

  const website = (data as any)?.settings?.website
  if (!website || typeof website !== 'object') {
    return data
  }

  if (website.logo !== undefined && website.logo !== null) {
    await assertTenantRelationship({
      collection: 'media',
      organizationID,
      path: 'settings.website.logo',
      req,
      value: website.logo,
    })
  }

  if (Array.isArray(website.navigation)) {
    for (let index = 0; index < website.navigation.length; index += 1) {
      const item = website.navigation[index]
      if (!item || typeof item !== 'object') {
        continue
      }

      if (item.kind === 'external') {
        if (!isSafeExternalURL(item.url)) {
          throw validationError(
            `settings.website.navigation.${index}.url`,
            'External navigation URLs must use http:// or https://.',
          )
        }
        continue
      }

      if (item.kind === 'route') {
        if (!isBuiltInPublicRoute(item.route)) {
          throw validationError(
            `settings.website.navigation.${index}.route`,
            'Select a supported built-in public route.',
          )
        }
        continue
      }

      await assertTenantRelationship({
        collection: 'pages',
        organizationID,
        path: `settings.website.navigation.${index}.page`,
        req,
        value: item.page,
      })
    }
  }

  return data
}
