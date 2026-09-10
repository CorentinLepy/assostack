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

type EventStatus = 'draft' | 'scheduled' | 'cancelled' | 'completed'

type EventDoc = {
  id: number | string
  title?: string | null
  status?: EventStatus | null
  startsAt?: string | null
  location?: { name?: string | null; city?: string | null } | null
}

type EventsData = {
  docs: EventDoc[]
  page?: number
  totalPages?: number
  totalDocs?: number
}

type Props = {
  data?: EventsData
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

const statusLabels: Record<EventStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Prévu',
  cancelled: 'Annulé',
  completed: 'Terminé',
}

const statusLabel = (status: EventDoc['status']) => (status && statusLabels[status]) || 'Inconnu'

const statusTone = (status: EventDoc['status']) => (status === 'scheduled' ? 'accent' : 'neutral')

const locationLabel = (location: EventDoc['location']) => {
  if (!location) {
    return '—'
  }

  return location.name ?? location.city ?? '—'
}

export const EventsListView = ({
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
  const basePath = '/admin/collections/events'

  const tabs = [
    {
      label: 'Tous',
      href: `${basePath}${buildQueryString(searchParams, { 'where[status][equals]': undefined, page: '1' })}`,
      isActive: statusFilter === '',
    },
    {
      label: 'À venir',
      href: `${basePath}${buildQueryString(searchParams, { 'where[status][equals]': 'scheduled', page: '1' })}`,
      isActive: statusFilter === 'scheduled',
    },
    {
      label: 'Passés',
      href: `${basePath}${buildQueryString(searchParams, { 'where[status][equals]': 'completed', page: '1' })}`,
      isActive: statusFilter === 'completed',
    },
    {
      label: 'Brouillons',
      href: `${basePath}${buildQueryString(searchParams, { 'where[status][equals]': 'draft', page: '1' })}`,
      isActive: statusFilter === 'draft',
    },
  ]

  const rows = docs.map((doc) => {
    const detailURL = `/admin/collections/events/${doc.id}`

    return {
      key: String(doc.id),
      cells: [
        <a className="assostack-list-page__link" href={detailURL} key="title">
          {doc.title ?? 'Sans titre'}
        </a>,
        formatShortDate(doc.startsAt),
        locationLabel(doc.location),
        <Badge key="status" tone={statusTone(doc.status)}>
          {statusLabel(doc.status)}
        </Badge>,
        <div className="assostack-table-actions" key="actions">
          <a href={detailURL}>Ouvrir</a>
        </div>,
      ],
    }
  })

  return (
    <main aria-labelledby="assostack-events-title" className="assostack-list-page">
      <AdminTopBar searchPlaceholder="Recherche globale (bientôt disponible)" />

      <PageHeader
        headingId="assostack-events-title"
        eyebrow="Événements"
        title="Événements"
        description="Planifiez et suivez les événements de votre association."
        actions={
          hasCreatePermission ? (
            <LinkButton href={newDocumentURL ?? '/admin/collections/events/create'}>
              Créer un événement
            </LinkButton>
          ) : null
        }
      />

      <Tabs ariaLabel="Segments des événements" tabs={tabs} />

      <FilterBar>
        <form
          action="/admin/collections/events"
          className="assostack-list-page__search"
          method="GET"
        >
          {statusFilter ? (
            <input name="where[status][equals]" type="hidden" value={statusFilter} />
          ) : null}
          <SearchInput
            ariaLabel="Rechercher un événement"
            defaultValue={search}
            name="search"
            placeholder="Rechercher un événement"
          />
          <button type="submit">Rechercher</button>
        </form>
      </FilterBar>

      {docs.length === 0 ? (
        <EmptyState
          title="Aucun événement pour le moment"
          description="Créez votre premier événement pour commencer à planifier vos activités."
          actionHref={
            hasCreatePermission ? (newDocumentURL ?? '/admin/collections/events/create') : undefined
          }
          actionLabel={hasCreatePermission ? 'Créer un événement' : undefined}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Liste des événements"
            columns={[
              { key: 'title', label: 'Nom', width: 'minmax(12rem, 2fr)' },
              { key: 'date', label: 'Date', width: 'minmax(7rem, 1fr)' },
              { key: 'location', label: 'Lieu', width: 'minmax(9rem, 1.2fr)' },
              { key: 'status', label: 'Statut', width: 'minmax(7rem, 0.9fr)' },
              { key: 'actions', label: 'Actions', width: 'minmax(5rem, 0.8fr)' },
            ]}
            rows={rows}
          />

          <footer className="assostack-list-page__pagination">
            <span>
              {data?.totalDocs ?? docs.length} événements · page {currentPage} / {totalPages}
            </span>
            <nav aria-label="Pagination des événements">
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
