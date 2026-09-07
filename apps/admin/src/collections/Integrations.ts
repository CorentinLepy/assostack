import type { CollectionConfig } from 'payload'
import { Forbidden } from 'payload'

import {
  canManageAnyOrganization,
  getRelationshipID,
  hasOrganizationRole,
  isPlatformAdmin,
  organizationRoleAccess,
} from '../access/organizations'
import { assertOrganizationWriteAccess } from '../hooks/assertOrganizationWriteAccess'
import { createDefaultIntegrationRegistry } from '../integrations/registry'
import { integrationProviders } from '../integrations/types'

const providerOptions = integrationProviders.map((value) => ({
  label: value,
  value,
}))
const integrationRegistry = createDefaultIntegrationRegistry()

const canCreateIntegration = ({ data, req }: { data?: unknown; req: { user: unknown } }): boolean => {
  if (isPlatformAdmin(req.user)) {
    return true
  }

  const organization =
    data && typeof data === 'object' && 'organization' in data ? (data as { organization?: unknown }).organization : null
  const organizationID = getRelationshipID(organization as any)
  return organizationID !== null && hasOrganizationRole(req.user, organizationID, ['organization-admin'])
}

const assertIntegrationOrganizationWriteAccess = ({ data, req }: { data?: unknown; req: { user: unknown; t: any } }) => {
  if (isPlatformAdmin(req.user)) {
    return data
  }

  const organization =
    data && typeof data === 'object' && 'organization' in data ? (data as { organization?: unknown }).organization : null
  const organizationID = getRelationshipID(organization as any)
  if (organizationID === null || !hasOrganizationRole(req.user, organizationID, ['organization-admin'])) {
    throw new Forbidden(req.t)
  }

  return data
}

const assertPersistedIntegrationOrganization = ({ doc, req }: { doc: unknown; req: { user: unknown; t: any } }) => {
  if (isPlatformAdmin(req.user)) {
    return doc
  }

  const organization =
    doc && typeof doc === 'object' && 'organization' in doc ? (doc as { organization?: unknown }).organization : null
  const organizationID = getRelationshipID(organization as any)
  if (organizationID === null || !hasOrganizationRole(req.user, organizationID, ['organization-admin'])) {
    throw new Forbidden(req.t)
  }

  return doc
}

export const Integrations: CollectionConfig = {
  slug: 'integrations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'provider', 'status', 'lastSuccessAt', 'lastFailureAt'],
    description: 'Organization-scoped provider configuration. Credentials are resolved outside Payload.',
  },
  access: {
    create: ({ data, req }) => canCreateIntegration({ data, req }),
    read: organizationRoleAccess(['organization-admin', 'editor']),
    update: organizationRoleAccess(['organization-admin']),
    delete: organizationRoleAccess(['organization-admin']),
  },
  hooks: {
    beforeValidate: [assertIntegrationOrganizationWriteAccess],
    beforeChange: [assertOrganizationWriteAccess(['organization-admin'])],
    afterChange: [assertPersistedIntegrationOrganization],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      options: providerOptions,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'disabled',
      options: [
        { label: 'Enabled', value: 'enabled' },
        { label: 'Disabled', value: 'disabled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'config',
      type: 'json',
      required: true,
      validate: (value, { siblingData }) => {
        const provider =
          siblingData && typeof siblingData === 'object' && 'provider' in siblingData
            ? siblingData.provider
            : undefined
        const adapter = integrationRegistry.get(String(provider ?? ''))
        return adapter?.validateConfig(value) ? true : 'Configuration must be a JSON object supported by the provider.'
      },
      admin: {
        description: 'Provider configuration only. Never put credentials or tokens here.',
      },
    },
    {
      name: 'secretRef',
      type: 'json',
      access: {
        read: () => false,
        create: ({ req }) => canManageAnyOrganization(req.user),
        update: ({ req }) => canManageAnyOrganization(req.user),
      },
      admin: {
        description: 'Opaque reference resolved by a SecretStore; it is never returned to API clients.',
      },
    },
    {
      name: 'lastSuccessAt',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'lastFailureAt',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'lastError',
      type: 'textarea',
      maxLength: 500,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}