'use client'

import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { useEffect, useState } from 'react'

import type { OrganizationModules } from './modules'

type OrganizationResponse = {
  settings?: {
    modules?: Partial<OrganizationModules>
  }
}

export const useOrganizationModules = (): Partial<OrganizationModules> | undefined => {
  const { selectedTenantID } = useTenantSelection()
  const [modules, setModules] = useState<Partial<OrganizationModules>>()

  useEffect(() => {
    if (!selectedTenantID) {
      setModules(undefined)
      return
    }

    let cancelled = false

    void fetch(`/api/organizations/${selectedTenantID}?depth=0`)
      .then(async (response) =>
        response.ok ? ((await response.json()) as OrganizationResponse) : null,
      )
      .then((organization) => {
        if (!cancelled) {
          setModules(organization?.settings?.modules)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModules(undefined)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedTenantID])

  return modules
}
