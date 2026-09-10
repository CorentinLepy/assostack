'use client'

import { usePathname } from 'next/navigation'
import type { SanitizedPermissions } from 'payload'
import { useMemo, useState } from 'react'

import {
  administrationLinks,
  filterReadableLinks,
  getVisibleDashboardDomains,
  toolNavigationTitles,
} from './product-navigation'
import { AssoStackMark } from './AssoStackBrand'
import { SectionLabel } from './ui/SectionLabel'
import { SidebarItem } from './ui/SidebarItem'
import { FileIcon, HomeIcon, SettingsIcon, UsersIcon } from './ui/icons'
import { useOrganizationModules } from './useOrganizationModules'
import { useAdminPermissions } from './useAdminPermissions'

type Props = {
  permissions?: SanitizedPermissions
}

export const AssoStackNav = ({ permissions }: Props) => {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const modules = useOrganizationModules()
  const effectivePermissions = useAdminPermissions(permissions)
  const domains = getVisibleDashboardDomains(effectivePermissions, modules)
  const administration = filterReadableLinks(effectivePermissions, administrationLinks)
  const managementDomains = useMemo(
    () =>
      domains.filter(
        (domain) => !toolNavigationTitles.includes(domain.title) && domain.primaryVisible,
      ),
    [domains],
  )
  const toolDomains = useMemo(
    () =>
      toolNavigationTitles
        .map((title) => domains.find((domain) => domain.title === title && domain.primaryVisible))
        .filter((domain) => Boolean(domain)),
    [domains],
  )

  const iconForCollection = (collection: string) => {
    if (collection === 'contacts' || collection === 'users') {
      return <UsersIcon className="assostack-icon" />
    }

    if (collection === 'organizations' || collection === 'integrations') {
      return <SettingsIcon className="assostack-icon" />
    }

    return <FileIcon className="assostack-icon" />
  }

  return (
    <nav
      className={`assostack-nav${collapsed ? ' assostack-nav--collapsed' : ''}`}
      aria-label="Navigation principale"
    >
      <div className="assostack-nav__context">
        <AssoStackMark className="assostack-nav__mark" size={24} />
        <div>
          <strong>AssoStack</strong>
          <span>Espace association</span>
        </div>
        <button
          aria-label={collapsed ? 'Déplier la navigation' : 'Réduire la navigation'}
          className="assostack-nav__collapse"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>
      <SidebarItem
        href="/admin"
        icon={<HomeIcon className="assostack-icon" />}
        isActive={pathname === '/admin'}
        label="Accueil"
      />

      {managementDomains.length > 0 ? (
        <div className="assostack-nav__section">
          <SectionLabel>Gestion</SectionLabel>
          {managementDomains.map((domain) => (
            <SidebarItem
              href={`/admin/collections/${domain.primary.collection}`}
              icon={iconForCollection(domain.primary.collection)}
              isActive={pathname.startsWith(`/admin/collections/${domain.primary.collection}`)}
              key={domain.title}
              label={domain.title}
            />
          ))}
        </div>
      ) : null}

      <div className="assostack-nav__section">
        <SectionLabel>Outils</SectionLabel>
        {toolDomains.map((domain) =>
          domain ? (
            <SidebarItem
              href={`/admin/collections/${domain.primary.collection}`}
              icon={iconForCollection(domain.primary.collection)}
              isActive={pathname.startsWith(`/admin/collections/${domain.primary.collection}`)}
              key={domain.title}
              label={domain.title}
            />
          ) : null,
        )}
      </div>

      {administration.length > 0 ? (
        <div className="assostack-nav__section">
          <SectionLabel>Administration</SectionLabel>
          {administration.map((link) => (
            <SidebarItem
              href={`/admin/collections/${link.collection}`}
              icon={iconForCollection(link.collection)}
              isActive={pathname.startsWith(`/admin/collections/${link.collection}`)}
              key={`${link.collection}-${link.label}`}
              label={link.label}
            />
          ))}
        </div>
      ) : null}
    </nav>
  )
}
