import type { CollectionBeforeChangeHook } from 'payload'
import { Forbidden } from 'payload/errors'

import {
  getRelationshipID,
  hasOrganizationRole,
  isPlatformAdmin,
  type OrganizationRole,
} from '../access/organizations'

export const assertOrganizationWriteAccess = (
  allowedRoles: readonly OrganizationRole[] = ['organization-admin', 'editor'],
): CollectionBeforeChangeHook => {
  return ({ data, originalDoc, req }) => {
    if (isPlatformAdmin(req.user)) {
      return data
    }

    const organizationID = getRelationshipID(data.organization ?? originalDoc?.organization)

    if (organizationID === null || !hasOrganizationRole(req.user, organizationID, allowedRoles)) {
      throw new Forbidden(req.t)
    }

    return data
  }
}
