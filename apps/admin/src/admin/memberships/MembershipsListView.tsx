import { Badge } from '../ui/Badge'
import { DataTable } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { FilterBar } from '../ui/FilterBar'
import { LinkButton } from '../ui/LinkButton'
import { PageHeader } from '../ui/PageHeader'
import { SearchInput } from '../ui/SearchInput'
import { Tabs } from '../ui/Tabs'
import { AdminTopBar } from '../ui/AdminTopBar'
import { formatShortDate } from '../format'

type SearchParams = Record<string, string | string[] | undefined>

type MembershipStatus = 'pending' | 'active' | 'suspended' | 'ended' | 'cancelled'

type MembershipDoc = {
  id: number | string
  contact?: { id?: number | string; displayName?: string | null } | number | null
  membershipType?: { id?: number | string; name?: string | null } | number | null
  status?: MembershipStatus | null
  startsAt?: string | null
  endsAt?: string | null
  membershipNumber?: string | null
}

type MembershipsData = {
  docs: MembershipDoc[]
  page?: number
  totalPages?: number
  totalDocs?: number
}

type Props = {
  data?: MembershipsData
  hasCreatePermission?: boolean
  newDocumentURL?: string
  searchParams?: SearchParams
}

const getParam = (searchParams: SearchParams | undefined, key: string): string => {
  const value = searchParams?.[key]

  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

const buildQueryString = (
  searchParams: SearchParams | undefined,
  overrides: Record<string, string | undefined>,
): string => {
  const params = new URLSearchParams()

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'page') {
        continue
      }

      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item))
      } else if (value) {
        params.set(key, value)
      }
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (!value) {
      params.delete(key)
      continue
    }

    params.set(key, value)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

const statusLabels: Record<MembershipStatus, string> = {
  pending: 'En attente',
  active: 'Active',
  suspended: 'Suspendue',
  ended: 'Expirée',
  cancelled: 'Annulée',
}

const statusLabel = (status: MembershipDoc['status']) =>
  (status && statusLabels[status]) || 'Inconnu'

const statusTone = (status: MembershipDoc['status']) => (status === 'active' ? 'accent' : 'neutral')

const contactName = (contact: MembershipDoc['contact']) =>
  typeof contact === 'object' && contact ? (contact.displayName ?? 'Contact') : 'Contact'

const membershipTypeName = (membershipType: MembershipDoc['membershipType']) =>
  typeof membershipType === 'object' && membershipType ? (membershipType.name ?? '—') : '—'

export const MembershipsListView = ({
  data,
  hasCreatePermission,
  newDocumentURL,
  searchParams,
}: Props) => {
  const docs = data?.docs ?? []
  const currentPage = data?.page ?? 1
  const totalPages = data?.totalPages ?? 1
  const search = getParam(searchParams, 'search')
  const statusFilter = getParam(searchParams, 'where[status][equals]')
  const basePath = '/admin/collections/memberships'

  const tabs = [
    {
      label: 'Toutes',
      href: `${basePath}${buildQueryString(searchParams, { 'where[status][equals]': undefined, page: '1' })}`,
      isActive: statusFilter === '',
    },
    {
      label: 'Actives',
      href: `${basePath}${buildQueryString(searchParams, { 'where[status][equals]': 'active', page: '1' })}`,
      isActive: statusFilter === 'active',
    },
    {
      label: 'En attente',
      href: `${basePath}${buildQueryString(searchParams, { 'where[status][equals]': 'pending', page: '1' })}`,
      isActive: statusFilter === 'pending',
    },
    {
      label: 'Expirées',
      href: `${basePath}${buildQueryString(searchParams, { 'where[status][equals]': 'ended', page: '1' })}`,
      isActive: statusFilter === 'ended',
    },
    {
      label: 'Suspendues',
      href: `${basePath}${buildQueryString(searchParams, { 'where[status][equals]': 'suspended', page: '1' })}`,
      isActive: statusFilter === 'suspended',
    },
  ]

  const rows = docs.map((doc) => {
    const detailURL = `/admin/collections/memberships/${doc.id}`

    return {
      key: String(doc.id),
      cells: [
        contactName(doc.contact),
        membershipTypeName(doc.membershipType),
        <Badge key="status" tone={statusTone(doc.status)}>
          {statusLabel(doc.status)}
        </Badge>,
        formatShortDate(doc.startsAt),
        formatShortDate(doc.endsAt),
        doc.membershipNumber ?? '—',
        <div className="assostack-table-actions" key="actions">
          <a href={detailURL}>Ouvrir</a>
        </div>,
      ],
    }
  })

  return (
    <main aria-labelledby="assostack-memberships-title" className="assostack-list-page">
      <AdminTopBar searchPlaceholder="Recherche globale (bientôt disponible)" />

      <PageHeader
        headingId="assostack-memberships-title"
        eyebrow="Adhésions"
        title="Adhésions"
        description="Suivez les adhésions, leur statut et leurs échéances."
        actions={
          hasCreatePermission ? (
            <LinkButton href={newDocumentURL ?? '/admin/collections/memberships/create'}>
              Ajouter une adhésion
            </LinkButton>
          ) : null
        }
      />

      <Tabs ariaLabel="Segments des adhésions" tabs={tabs} />

      <FilterBar>
        <form
          action="/admin/collections/memberships"
          className="assostack-list-page__search"
          method="GET"
        >
          {statusFilter ? (
            <input name="where[status][equals]" type="hidden" value={statusFilter} />
          ) : null}
          <SearchInput
            ariaLabel="Rechercher une adhésion"
            defaultValue={search}
            name="search"
            placeholder="Rechercher un numéro d’adhésion ou une référence"
          />
          <button type="submit">Rechercher</button>
        </form>
      </FilterBar>

      {docs.length === 0 ? (
        <EmptyState
          title="Aucune adhésion pour le moment"
          description="Ajoutez une première adhésion pour suivre son statut et son échéance."
          actionHref={
            hasCreatePermission
              ? (newDocumentURL ?? '/admin/collections/memberships/create')
              : undefined
          }
          actionLabel={hasCreatePermission ? 'Ajouter une adhésion' : undefined}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Liste des adhésions"
            columns={[
              { key: 'contact', label: 'Contact', width: 'minmax(11rem, 1.8fr)' },
              { key: 'type', label: 'Type d’adhésion', width: 'minmax(9rem, 1.2fr)' },
              { key: 'status', label: 'Statut', width: 'minmax(7rem, 0.9fr)' },
              { key: 'startsAt', label: 'Début', width: 'minmax(6rem, 0.8fr)' },
              { key: 'endsAt', label: 'Fin', width: 'minmax(6rem, 0.8fr)' },
              { key: 'membershipNumber', label: 'Numéro d’adhésion', width: 'minmax(8rem, 1fr)' },
              { key: 'actions', label: 'Actions', width: 'minmax(5rem, 0.7fr)' },
            ]}
            rows={rows}
          />

          <footer className="assostack-list-page__pagination">
            <span>
              {data?.totalDocs ?? docs.length} adhésions · page {currentPage} / {totalPages}
            </span>
            <nav aria-label="Pagination des adhésions">
              {currentPage > 1 ? (
                <a
                  href={`${basePath}${buildQueryString(searchParams, {
                    page: String(currentPage - 1),
                  })}`}
                >
                  Précédent
                </a>
              ) : null}
              {currentPage < totalPages ? (
                <a
                  href={`${basePath}${buildQueryString(searchParams, {
                    page: String(currentPage + 1),
                  })}`}
                >
                  Suivant
                </a>
              ) : null}
            </nav>
          </footer>
        </>
      )}
    </main>
  )
}
