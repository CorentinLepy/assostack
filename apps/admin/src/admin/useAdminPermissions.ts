'use client'

import { useAuth } from '@payloadcms/ui'
import type { SanitizedPermissions } from 'payload'
import { useEffect, useState } from 'react'

export const useAdminPermissions = (
  initialPermissions?: SanitizedPermissions,
): SanitizedPermissions | undefined => {
  const { permissions: authPermissions } = useAuth()
  const [permissions, setPermissions] = useState<SanitizedPermissions | undefined>(
    initialPermissions ?? authPermissions,
  )

  useEffect(() => {
    if (initialPermissions ?? authPermissions) {
      setPermissions(initialPermissions ?? authPermissions)
      return
    }

    let cancelled = false

    void fetch('/api/access')
      .then(async (response) =>
        response.ok ? ((await response.json()) as SanitizedPermissions) : undefined,
      )
      .then((access) => {
        if (!cancelled) {
          setPermissions(access)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authPermissions, initialPermissions])

  return initialPermissions ?? authPermissions ?? permissions
}
