import type { Access, AccessArgs, AccessResult } from 'payload'

export const organizationRoles = ['organization-admin', 'editor', 'member'] as const
export type OrganizationRole = (typeof organizationRoles)[number]

export type RelationshipID = number | string

type RelationshipValue = RelationshipID | { id?: RelationshipID | null } | null | undefined

type OrganizationMembership = {
  organization?: RelationshipValue
  roles?: OrganizationRole[] | null
}

type UserWithOrganizations = {
  organizations?: OrganizationMembership[] | null
  platformRoles?: string[] | null
}

export const getRelationshipID = (value: RelationshipValue): RelationshipID | null => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    const id = value.id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }

  return null
}

const asUserWithOrganizations = (user: unknown): UserWithOrganizations | null => {
  if (!user || typeof user !== 'object') {
    return null
  }

  return user as UserWithOrganizations
}

export const isPlatformAdmin = (user: unknown): boolean => {
  const typedUser = asUserWithOrganizations(user)
  return typedUser?.platformRoles?.includes('platform-admin') ?? false
}

export const getOrganizationIDsForRoles = (
  user: unknown,
  allowedRoles: readonly OrganizationRole[] = organizationRoles,
): RelationshipID[] => {
  if (isPlatformAdmin(user)) {
    return []
  }

  const typedUser = asUserWithOrganizations(user)
  const memberships = typedUser?.organizations ?? []
  const allowed = new Set<OrganizationRole>(allowedRoles)
  const ids = new Set<RelationshipID>()

  for (const membership of memberships) {
    const roles = membership.roles ?? []
    if (!roles.some((role) => allowed.has(role))) {
      continue
    }

    const id = getRelationshipID(membership.organization)
    if (id !== null) {
      ids.add(id)
    }
  }

  return [...ids]
}

export const hasOrganizationRole = (
  user: unknown,
  organizationID: RelationshipID,
  allowedRoles: readonly OrganizationRole[],
): boolean => {
  if (isPlatformAdmin(user)) {
    return true
  }

  return getOrganizationIDsForRoles(user, allowedRoles).some(
    (candidate) => String(candidate) === String(organizationID),
  )
}

export const organizationRoleAccess = (allowedRoles: readonly OrganizationRole[]): Access => {
  return ({ req }: AccessArgs): AccessResult => {
    if (isPlatformAdmin(req.user)) {
      return true
    }

    const organizationIDs = getOrganizationIDsForRoles(req.user, allowedRoles)
    if (organizationIDs.length === 0) {
      return false
    }

    return {
      organization: {
        in: organizationIDs,
      },
    }
  }
}

export const organizationRecordAccess = (allowedRoles: readonly OrganizationRole[]): Access => {
  return ({ req }: AccessArgs): AccessResult => {
    if (isPlatformAdmin(req.user)) {
      return true
    }

    const organizationIDs = getOrganizationIDsForRoles(req.user, allowedRoles)
    if (organizationIDs.length === 0) {
      return false
    }

    return {
      id: {
        in: organizationIDs,
      },
    }
  }
}

export const canManageAnyOrganization = (
  user: unknown,
  allowedRoles: readonly OrganizationRole[] = ['organization-admin', 'editor'],
): boolean => isPlatformAdmin(user) || getOrganizationIDsForRoles(user, allowedRoles).length > 0
