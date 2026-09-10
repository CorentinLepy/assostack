import { describe, expect, test } from 'vitest'

import {
  resolveConfiguredOptionalModuleIDs,
  resolveEnabledModuleIDs,
  validateModuleDependencies,
} from '@/admin/module-policy'

describe('module policy', () => {
  test('resolves optional module IDs from legacy booleans', () => {
    const selected = resolveConfiguredOptionalModuleIDs({
      memberships: true,
      events: false,
      volunteers: false,
      partnerships: true,
      forms: true,
      website: false,
    })

    expect([...selected].sort()).toEqual(['forms', 'memberships', 'partnerships'])
  })

  test('resolves optional module IDs from enabled list', () => {
    const selected = resolveConfiguredOptionalModuleIDs({
      enabled: ['events', 'website'],
      memberships: false,
      forms: false,
    })

    expect([...selected].sort()).toEqual(['events', 'website'])
  })

  test('expands dependencies into enabled module set', () => {
    const enabled = resolveEnabledModuleIDs({
      enabled: ['volunteers'],
    })

    expect(enabled.has('contacts')).toBe(true)
    expect(enabled.has('events')).toBe(true)
    expect(enabled.has('volunteers')).toBe(true)
    expect(enabled.has('documents')).toBe(true)
    expect(enabled.has('administration')).toBe(true)
  })

  test('reports missing dependencies for optional modules', () => {
    const issues = validateModuleDependencies({
      enabled: ['volunteers'],
    })

    expect(issues).toEqual([
      {
        module: 'volunteers',
        missing: 'events',
      },
    ])
  })

  test('accepts valid dependency graph', () => {
    const issues = validateModuleDependencies({
      enabled: ['events', 'volunteers'],
    })

    expect(issues).toEqual([])
  })
})
