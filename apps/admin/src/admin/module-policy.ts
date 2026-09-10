import type { SanitizedPermissions } from 'payload'

import {
  configurableOptionalModuleIDs,
  coreModuleIDs,
  moduleRegistryByID,
  type ModuleID,
} from './module-registry'
import type { OrganizationModules, OrganizationModuleID } from './modules'

export type ModuleDependencyIssue = {
  module: ModuleID
  missing: ModuleID
}

const isModuleID = (value: string): value is ModuleID => moduleRegistryByID.has(value as ModuleID)

export const resolveConfiguredOptionalModuleIDs = (
  modules: Partial<OrganizationModules> | undefined,
): Set<OrganizationModuleID> => {
  if (Array.isArray(modules?.enabled)) {
    return new Set(
      modules.enabled.filter((id): id is OrganizationModuleID =>
        configurableOptionalModuleIDs.includes(id),
      ),
    )
  }

  return new Set(configurableOptionalModuleIDs.filter((id) => modules?.[id] !== false))
}

export const expandModuleDependencies = (moduleIDs: Iterable<ModuleID>): Set<ModuleID> => {
  const expanded = new Set<ModuleID>(moduleIDs)
  let changed = true

  while (changed) {
    changed = false

    for (const moduleID of [...expanded]) {
      const module = moduleRegistryByID.get(moduleID)
      if (!module) {
        continue
      }

      for (const dependency of module.dependencies) {
        if (!isModuleID(dependency)) {
          continue
        }

        if (!expanded.has(dependency)) {
          expanded.add(dependency)
          changed = true
        }
      }
    }
  }

  return expanded
}

export const resolveEnabledModuleIDs = (
  modules: Partial<OrganizationModules> | undefined,
): Set<ModuleID> => {
  const configuredOptional = resolveConfiguredOptionalModuleIDs(modules)
  return expandModuleDependencies([...coreModuleIDs, ...configuredOptional])
}

export const validateModuleDependencies = (
  modules: Partial<OrganizationModules> | undefined,
): ModuleDependencyIssue[] => {
  const selected = resolveConfiguredOptionalModuleIDs(modules)
  const issues: ModuleDependencyIssue[] = []

  for (const moduleID of selected) {
    const module = moduleRegistryByID.get(moduleID)
    if (!module) {
      continue
    }

    for (const dependency of module.dependencies) {
      if (!isModuleID(dependency)) {
        continue
      }

      if (
        !coreModuleIDs.includes(dependency) &&
        !selected.has(dependency as OrganizationModuleID)
      ) {
        issues.push({ module: moduleID, missing: dependency })
      }
    }
  }

  return issues
}

export const isModuleEnabled = (
  modules: Partial<OrganizationModules> | undefined,
  moduleID: ModuleID | undefined,
): boolean => {
  if (!moduleID) {
    return true
  }

  return resolveEnabledModuleIDs(modules).has(moduleID)
}

export const canReadCollectionFromPermissions = (
  permissions: SanitizedPermissions | undefined,
  collection: string,
): boolean => {
  const collectionPermissions = permissions?.collections?.[collection]
  const read = collectionPermissions?.read as unknown

  if (read === true) {
    return true
  }

  if (!read || typeof read !== 'object') {
    return false
  }

  const typedRead = read as { permission?: boolean }

  return typedRead.permission === true
}
