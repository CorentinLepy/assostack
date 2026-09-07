import { getOrganizationIDsForRoles } from '@/access/organizations'
import config from '@/payload.config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

const asRequestUser = <T extends Record<string, unknown>>(user: T) => ({
  ...user,
  collection: 'users' as const,
})

const relationshipID = (value: any) =>
  value && typeof value === 'object' && 'id' in value ? value.id : value

describe('Privacy tenant access diagnostics', () => {
  let organizationA: any
  let organizationB: any
  let adminA: any
  let purposeA: any
  let purposeB: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    organizationA = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Privacy Diagnostic A', slug: 'privacy-diagnostic-a', status: 'active' } as any,
    })
    organizationB = await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: { name: 'Privacy Diagnostic B', slug: 'privacy-diagnostic-b', status: 'active' } as any,
    })

    adminA = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'privacy-diagnostic-admin-a@assostack.test',
        password: 'test-password-123',
        name: 'Privacy Diagnostic Admin A',
        platformRoles: ['user'],
        organizations: [{ organization: organizationA.id, roles: ['organization-admin'] }],
      } as any,
    })

    purposeA = await payload.create({
      collection: 'privacy-purposes',
      overrideAccess: true,
      data: {
        organization: organizationA.id,
        name: 'Diagnostic purpose A',
        legalBasis: 'consent',
      } as any,
    })
    purposeB = await payload.create({
      collection: 'privacy-purposes',
      overrideAccess: true,
      data: {
        organization: organizationB.id,
        name: 'Diagnostic purpose B',
        legalBasis: 'consent',
      } as any,
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  test('persists organization and derives the expected staff scope', () => {
    expect(relationshipID(purposeA.organization)).toBe(organizationA.id)
    expect(relationshipID(purposeB.organization)).toBe(organizationB.id)
    expect(getOrganizationIDsForRoles(asRequestUser(adminA), ['organization-admin', 'editor'])).toEqual([
      organizationA.id,
    ])
  })

  test('explicit organization where clause filters the collection', async () => {
    const result = await payload.find({
      collection: 'privacy-purposes',
      overrideAccess: true,
      depth: 0,
      limit: 50,
      where: {
        organization: {
          equals: organizationA.id,
        },
      },
    })

    expect(result.docs.map((doc) => doc.id)).toContain(purposeA.id)
    expect(result.docs.map((doc) => doc.id)).not.toContain(purposeB.id)
  })

  test('collection access applies the same tenant scope to Local API reads', async () => {
    const result = await payload.find({
      collection: 'privacy-purposes',
      overrideAccess: false,
      user: asRequestUser(adminA) as any,
      depth: 0,
      limit: 50,
    })

    expect(result.docs.map((doc) => doc.id)).toContain(purposeA.id)
    expect(result.docs.map((doc) => doc.id)).not.toContain(purposeB.id)
  })
})
