import {
  type ConfigurableOptionalModuleID,
  configurableOptionalModuleIDs,
  type ModuleID,
} from './module-registry'
import {
  isModuleEnabled,
  resolveEnabledModuleIDs,
  resolveConfiguredOptionalModuleIDs,
  validateModuleDependencies,
} from './module-policy'

export const organizationModuleIDs = configurableOptionalModuleIDs

export type OrganizationModuleID = (typeof organizationModuleIDs)[number]

export type OrganizationModules = {
  enabled?: OrganizationModuleID[]
} & Partial<Record<OrganizationModuleID, boolean>>

export const defaultOrganizationModules: Record<OrganizationModuleID, boolean> = {
  memberships: true,
  events: true,
  volunteers: true,
  partnerships: true,
  forms: true,
  website: true,
}

export const isOrganizationModuleEnabled = (
  modules: Partial<OrganizationModules> | undefined,
  module: ModuleID | undefined,
): boolean => isModuleEnabled(modules, module)

export const resolveOrganizationEnabledModuleIDs = (
  modules: Partial<OrganizationModules> | undefined,
): Set<ModuleID> => resolveEnabledModuleIDs(modules)

export const resolveConfiguredOrganizationOptionalModuleIDs = (
  modules: Partial<OrganizationModules> | undefined,
): Set<ConfigurableOptionalModuleID> => resolveConfiguredOptionalModuleIDs(modules)

export const validateOrganizationModuleDependencies = (
  modules: Partial<OrganizationModules> | undefined,
) => validateModuleDependencies(modules)
