import type { FieldHook } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID } from '../access/organizations'

export const ensureMediaBelongsToCurrentOrganization: FieldHook = async ({
  data,
  originalDoc,
  path,
  req,
  value,
}) => {
  if (value === null || value === undefined) {
    return value
  }

  const mediaID = getRelationshipID(value)
  const organizationID = getRelationshipID(data?.organization ?? originalDoc?.organization)

  if (mediaID === null || organizationID === null) {
    return value
  }

  try {
    const media = await req.payload.findByID({
      collection: 'media',
      id: mediaID as any,
      overrideAccess: true,
      req,
    })

    const mediaOrganizationID = getRelationshipID((media as any).organization)
    if (mediaOrganizationID === null || String(mediaOrganizationID) !== String(organizationID)) {
      throw new Error('tenant-mismatch')
    }
  } catch {
    throw new ValidationError({
      errors: [
        {
          message: 'Referenced media must belong to the same organization.',
          path: path.map(String).join('.'),
        },
      ],
    })
  }

  return value
}
