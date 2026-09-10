import type { CollectionAfterReadHook, CollectionBeforeValidateHook } from 'payload'

import { configurableOptionalModuleOptions } from '../admin/module-registry'
import {
  defaultOrganizationModules,
  organizationModuleIDs,
  resolveConfiguredOrganizationOptionalModuleIDs,
  validateOrganizationModuleDependencies,
  type OrganizationModuleID,
  type OrganizationModules,
} from '../admin/modules'

type OrganizationLike = {
  settings?: {
    modules?: Partial<OrganizationModules>
  }
}

const cloneModules = (
  input: Partial<OrganizationModules> | undefined,
): Partial<OrganizationModules> => ({ ...(input ?? {}) })

export const normalizeOrganizationModules: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data || typeof data !== 'object') {
    return data
  }

  const nextData = data as OrganizationLike
  const previousData = originalDoc as OrganizationLike

  const nextModules = nextData?.settings?.modules
  const previousModules = previousData?.settings?.modules

  const merged = {
    ...cloneModules(previousModules),
    ...cloneModules(nextModules),
  }

  const issues = validateOrganizationModuleDependencies(merged)
  if (issues.length > 0) {
    const firstIssue = issues[0]
    const moduleLabel = configurableOptionalModuleOptions.find(
      (option) => option.value === firstIssue?.module,
    )?.label
    const dependencyLabel = configurableOptionalModuleOptions.find(
      (option) => option.value === firstIssue?.missing,
    )?.label

    throw new Error(
      `Le module ${moduleLabel ?? firstIssue?.module} nécessite ${dependencyLabel ?? firstIssue?.missing}.`,
    )
  }

  const configuredIDs = resolveConfiguredOrganizationOptionalModuleIDs(merged)
  const normalized = {
    ...cloneModules(merged),
    enabled: [...configuredIDs],
  }

  for (const moduleID of organizationModuleIDs) {
    normalized[moduleID] = configuredIDs.has(moduleID as OrganizationModuleID)
      ? true
      : false
  }

  return {
    ...nextData,
    settings: {
      ...nextData.settings,
      modules: normalized,
    },
  }
}

export const materializeOrganizationModules: CollectionAfterReadHook = ({ doc }) => {
  if (!doc || typeof doc !== 'object') {
    return doc
  }

  const typedDoc = doc as OrganizationLike
  const modules = cloneModules(typedDoc.settings?.modules)
  const configured = resolveConfiguredOrganizationOptionalModuleIDs(modules)

  return {
    ...typedDoc,
    settings: {
      ...typedDoc.settings,
      modules: {
        ...modules,
        enabled: [...configured],
      },
    },
  }
}