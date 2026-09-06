import type { FieldHook, TextField, Where } from 'payload'
import { ValidationError } from 'payload'

import { getRelationshipID } from '../access/organizations'

const normalizeSlug = (input: string): string =>
  input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeSlugHook: FieldHook = ({ siblingData, value }) => {
  const source = typeof value === 'string' && value.trim().length > 0 ? value : siblingData.title

  if (typeof source !== 'string') {
    return value
  }

  return normalizeSlug(source)
}

const ensureTenantSlugUnique: FieldHook = async ({ collection, data, originalDoc, req, value }) => {
  if (!collection || typeof value !== 'string' || value.length === 0) {
    return value
  }

  const organizationID = getRelationshipID(data?.organization ?? originalDoc?.organization)
  if (organizationID === null) {
    return value
  }

  const constraints: Where[] = [
    {
      slug: {
        equals: value,
      },
    },
    {
      organization: {
        equals: organizationID,
      },
    },
  ]

  if (originalDoc?.id !== undefined && originalDoc?.id !== null) {
    constraints.push({
      id: {
        not_equals: originalDoc.id,
      },
    })
  }

  const duplicate = await req.payload.find({
    collection: collection.slug as any,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      and: constraints,
    },
  })

  if (duplicate.totalDocs > 0) {
    throw new ValidationError({
      errors: [
        {
          message: 'This slug is already used by another item in the same organization.',
          path: 'slug',
        },
      ],
    })
  }

  return value
}

export const tenantSlugField = (): TextField => ({
  name: 'slug',
  type: 'text',
  required: true,
  index: true,
  unique: false,
  admin: {
    description: 'URL-safe identifier. It must be unique within the current organization.',
    position: 'sidebar',
  },
  hooks: {
    beforeValidate: [normalizeSlugHook],
    beforeChange: [ensureTenantSlugUnique],
  },
})
