import type { CollectionBeforeChangeHook } from 'payload'

export const ensureFirstUserPlatformAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') {
    return data
  }

  const existingUsers = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
    req,
  })

  if (existingUsers.totalDocs === 0) {
    return {
      ...data,
      platformRoles: ['platform-admin'],
    }
  }

  return data
}
