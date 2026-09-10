'use client'

import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { useAuth } from '@payloadcms/ui'

import { SearchInput } from './SearchInput'
import { BellIcon } from './icons'

type Props = {
  searchPlaceholder?: string
}

export const AdminTopBar = ({ searchPlaceholder }: Props) => {
  const { options, selectedTenantID, setTenant } = useTenantSelection()
  const { user } = useAuth()
  const toDisplayLabel = (label: unknown): string => {
    if (typeof label === 'string') {
      return label
    }

    if (label && typeof label === 'object' && 'fr' in label) {
      const french = (label as Record<string, unknown>).fr
      return typeof french === 'string' ? french : 'Organisation'
    }

    return 'Organisation'
  }

  return (
    <header className="assostack-topbar" aria-label="Barre de contexte AssoStack">
      <div className="assostack-topbar__org">
        <label htmlFor="assostack-tenant-switcher">Organisation</label>
        <select
          id="assostack-tenant-switcher"
          onChange={(event) => setTenant({ id: event.target.value || undefined, refresh: true })}
          value={selectedTenantID ?? ''}
        >
          <option value="">Sélectionner</option>
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {toDisplayLabel(option.label)}
            </option>
          ))}
        </select>
      </div>

      <form
        action="#"
        className="assostack-topbar__search"
        onSubmit={(event) => event.preventDefault()}
      >
        <SearchInput
          ariaLabel="Recherche globale bientôt disponible"
          defaultValue=""
          name="global-search"
          placeholder={searchPlaceholder ?? 'Recherche globale (bientôt disponible)'}
        />
      </form>

      <div className="assostack-topbar__user" aria-label="Espace utilisateur">
        <button
          aria-label="Notifications indisponibles"
          className="assostack-icon-button"
          title="Notifications bientôt disponibles"
          type="button"
        >
          <BellIcon className="assostack-icon" />
        </button>
        <a className="assostack-topbar__account" href="/admin/account">
          {user?.email ?? 'Compte connecté'}
        </a>
      </div>
    </header>
  )
}
