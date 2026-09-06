import type { FieldHook } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID } from '../access/organizations'

type TenantRelationshipCollection = 'media' | 'pages'

const ensureRelationshipBelongsToCurrentOrganization = (
  collection: TenantRelationshipCollection,
  message: string,
): FieldHook => {
  return async ({ data, originalDoc, path, req, value }) => {
    if (value === null || value === undefined || value === '') {
      return value
    }

    const relationshipID = getRelationshipID(value)
    const organizationID = getRelationshipID(data?.organization ?? originalDoc?.organization)

    if (relationshipID === null || organizationID === null) {
      return value
    }

    try {
      const related = await req.payload.findByID({
        collection,
        id: relationshipID as any,
        depth: 0,
        overrideAccess: true,
        req,
      })

      const relatedOrganizationID = getRelationshipID((related as any).organization)
      if (
        relatedOrganizationID === null ||
        String(relatedOrganizationID) !== String(organizationID)
      ) {
        throw new Error('tenant-mismatch')
      }
    } catch {
      throw new ValidationError({
        errors: [
          {
            message,
            path: path.map(String).join('.'),
          },
        ],
      })
    }

    return value
  }
}

export const ensureMediaBelongsToCurrentOrganization =
  ensureRelationshipBelongsToCurrentOrganization(
    'media',
    'Referenced media must belong to the same organization.',
  )

export const ensurePageBelongsToCurrentOrganization =
  ensureRelationshipBelongsToCurrentOrganization(
    'pages',
    'Referenced page must belong to the same organization.',
  )
