'use client'

import type { SanitizedPermissions } from 'payload'

import {
  administrationLinks,
  advancedAdministrationLinks,
  canReadCollection,
  filterReadableLinks,
  getVisibleDashboardDomains,
} from './product-navigation'
import type { DashboardOperationalData } from './dashboard-operational-data'
import { formatShortDate } from './format'
import { isModuleEnabled } from './module-policy'
import { Card } from './ui/Card'
import { EmptyState } from './ui/EmptyState'
import { LinkButton } from './ui/LinkButton'
import { PageHeader } from './ui/PageHeader'
import { SectionHeader } from './ui/SectionHeader'
import { AdminTopBar } from './ui/AdminTopBar'
import { useOrganizationModules } from './useOrganizationModules'
import { useAdminPermissions } from './useAdminPermissions'

type Props = {
  initPageResult?: {
    permissions?: SanitizedPermissions
  }
  operational?: DashboardOperationalData
  permissions?: SanitizedPermissions
}

type OperationalItem = {
  id: number | string
  primary: string
  secondary?: string
}

const OperationalSection = ({
  title,
  emptyLabel,
  items,
  href,
  linkLabel,
}: {
  title: string
  emptyLabel: string
  items: OperationalItem[]
  href: string
  linkLabel: string
}) => (
  <Card className="assostack-dashboard__slot">
    <h3>{title}</h3>
    {items.length > 0 ? (
      <ul className="assostack-dashboard__slot-list">
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.primary}</span>
            {item.secondary ? (
              <span className="assostack-dashboard__slot-meta">{item.secondary}</span>
            ) : null}
          </li>
        ))}
      </ul>
    ) : (
      <p>{emptyLabel}</p>
    )}
    <LinkButton href={href} secondary>
      {linkLabel}
    </LinkButton>
  </Card>
)

export const AssociationDashboard = ({
  initPageResult,
  operational,
  permissions: directPermissions,
}: Props) => {
  const permissions = useAdminPermissions(directPermissions ?? initPageResult?.permissions)
  const modules = useOrganizationModules()
  const visibleDomains = getVisibleDashboardDomains(permissions, modules)
  const visibleAdministrationLinks = filterReadableLinks(permissions, administrationLinks)
  const visibleAdvancedAdministrationLinks = filterReadableLinks(
    permissions,
    advancedAdministrationLinks,
  )
  const hasOrganizationContext = operational?.organizationId !== undefined
  const canOpenEvents =
    hasOrganizationContext &&
    isModuleEnabled(modules, 'events') &&
    canReadCollection(permissions, 'events')
  const canOpenMemberships =
    hasOrganizationContext &&
    isModuleEnabled(modules, 'memberships') &&
    canReadCollection(permissions, 'memberships')
  const canOpenTasks = hasOrganizationContext && canReadCollection(permissions, 'tasks')
  const canOpenInteractions =
    hasOrganizationContext && canReadCollection(permissions, 'interactions')
  const canOpenContacts = canReadCollection(permissions, 'contacts')

  return (
    <main className="assostack-dashboard" aria-labelledby="assostack-dashboard-title">
      <AdminTopBar searchPlaceholder="Rechercher un contact, un événement ou un document" />

      <PageHeader
        headingId="assostack-dashboard-title"
        eyebrow="AssoStack"
        title="Bonjour, bienvenue dans votre espace"
        description="Retrouvez vos actions clés et accédez rapidement aux modules de gestion de l'association."
        actions={
          canOpenContacts ? (
            <LinkButton href="/admin/collections/contacts/create">Ajouter un contact</LinkButton>
          ) : null
        }
      />

      {visibleDomains.length > 0 ? (
        <section className="assostack-dashboard__modules" aria-label="Modules principaux">
          {visibleDomains.map((domain) => (
            <Card className="assostack-dashboard__module" key={domain.title}>
              <div className="assostack-dashboard__module-copy">
                <h2>{domain.title}</h2>
                <p>{domain.description}</p>
              </div>
              <nav aria-label={`${domain.title} - actions`}>
                {domain.primaryVisible ? (
                  <a
                    className="assostack-dashboard__primary-link"
                    href={`/admin/collections/${domain.primary.collection}`}
                  >
                    {domain.primary.label}
                  </a>
                ) : null}
                {domain.secondary.map((link) => (
                  <a
                    className="assostack-dashboard__secondary-link"
                    href={`/admin/collections/${link.collection}`}
                    key={link.collection}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Aucun raccourci disponible"
          description="Demandez à un administrateur de vérifier les accès associés à votre compte."
        />
      )}

      <section
        className="assostack-dashboard__context"
        aria-labelledby="assostack-dashboard-context-title"
      >
        <SectionHeader
          eyebrow="Contexte"
          title="Organisation active"
          description="Le contenu affiché dépend de l'organisation sélectionnée et de vos autorisations."
        />
      </section>

      <section className="assostack-dashboard__shortcut-grid" aria-label="Sections rapides">
        {canOpenEvents ? (
          <OperationalSection
            emptyLabel="Aucun événement à venir."
            href="/admin/collections/events"
            items={(operational?.upcomingEvents ?? []).map((event) => ({
              id: event.id,
              primary: event.title,
              secondary: formatShortDate(event.startsAt),
            }))}
            linkLabel="Ouvrir les événements"
            title="Événements à venir"
          />
        ) : null}
        {canOpenMemberships ? (
          <OperationalSection
            emptyLabel="Aucune adhésion n'expire dans les 30 prochains jours."
            href="/admin/collections/memberships"
            items={(operational?.membershipRenewals ?? []).map((renewal) => ({
              id: renewal.id,
              primary: renewal.contactName,
              secondary: `Expire le ${formatShortDate(renewal.endsAt)}`,
            }))}
            linkLabel="Ouvrir les adhésions"
            title="Adhésions à renouveler"
          />
        ) : null}
        {canOpenTasks ? (
          <OperationalSection
            emptyLabel="Aucune tâche ouverte."
            href="/admin/collections/tasks"
            items={(operational?.openTasks ?? []).map((task) => ({
              id: task.id,
              primary: task.title,
              secondary: task.dueAt ? `Échéance : ${formatShortDate(task.dueAt)}` : undefined,
            }))}
            linkLabel="Ouvrir les tâches"
            title="Actions en cours"
          />
        ) : null}
        {canOpenInteractions ? (
          <OperationalSection
            emptyLabel="Aucune interaction récente."
            href="/admin/collections/interactions"
            items={(operational?.recentActivity ?? []).map((activity) => ({
              id: activity.id,
              primary: activity.subject,
              secondary: formatShortDate(activity.occurredAt),
            }))}
            linkLabel="Voir l'activité"
            title="Activité récente"
          />
        ) : null}
      </section>

      <section
        className="assostack-dashboard__admin"
        aria-labelledby="assostack-dashboard-admin-title"
      >
        <SectionHeader
          eyebrow="Configuration"
          headingId="assostack-dashboard-admin-title"
          title="Administration"
        />
        <p>Gérez l’organisation, les utilisateurs, les intégrations et les réglages avancés.</p>
        {visibleAdministrationLinks.length > 0 ? (
          <nav aria-label="Administration - actions">
            {visibleAdministrationLinks.map((link) => (
              <a href={`/admin/collections/${link.collection}`} key={link.collection}>
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
        {visibleAdvancedAdministrationLinks.length > 0 ? (
          <div className="assostack-dashboard__advanced">
            <p className="assostack-dashboard__advanced-label">Ressources avancées</p>
            <nav aria-label="Ressources avancées - actions">
              {visibleAdvancedAdministrationLinks.map((link) => (
                <a href={`/admin/collections/${link.collection}`} key={link.collection}>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        ) : null}
      </section>
    </main>
  )
}
