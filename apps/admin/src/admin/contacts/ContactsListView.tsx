import { Badge } from '../ui/Badge'
import { DataTable } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { FilterBar } from '../ui/FilterBar'
import { LinkButton } from '../ui/LinkButton'
import { PageHeader } from '../ui/PageHeader'
import { SearchInput } from '../ui/SearchInput'
import { Tabs } from '../ui/Tabs'
import { AdminTopBar } from '../ui/AdminTopBar'

type SearchParams = Record<string, string | string[] | undefined>

type ContactDoc = {
  id: number | string
  displayName?: string | null
  kind?: 'person' | 'organization' | null
  email?: string | null
  phone?: string | null
  status?: 'active' | 'archived' | null
  updatedAt?: string | null
  tags?: Array<{ id?: number | string; name?: string | null }> | null
}

type ContactsData = {
  docs: ContactDoc[]
  page?: number
  totalPages?: number
  totalDocs?: number
}

type Props = {
  data?: ContactsData
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

const kindLabel = (kind: ContactDoc['kind']) => {
  if (kind === 'organization') {
    return 'Organisation'
  }

  return 'Personne'
}

const statusLabel = (status: ContactDoc['status']) => {
  if (status === 'archived') {
    return 'Archivé'
  }

  return 'Actif'
}

const initialsFromName = (displayName: string | null | undefined): string => {
  if (!displayName) {
    return '?'
  }

  const tokens = displayName.trim().split(/\s+/).filter(Boolean)

  if (tokens.length === 0) {
    return '?'
  }

  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('')
}

const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export const ContactsListView = ({
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
  const kindFilter = getParam(searchParams, 'where[kind][equals]')
  const basePath = '/admin/collections/contacts'

  const tabs = [
    {
      label: 'Tous',
      href: `${basePath}${buildQueryString(searchParams, { 'where[kind][equals]': undefined, page: '1' })}`,
      isActive: kindFilter === '',
    },
    {
      label: 'Personnes',
      href: `${basePath}${buildQueryString(searchParams, { 'where[kind][equals]': 'person', page: '1' })}`,
      isActive: kindFilter === 'person',
    },
    {
      label: 'Organisations',
      href: `${basePath}${buildQueryString(searchParams, { 'where[kind][equals]': 'organization', page: '1' })}`,
      isActive: kindFilter === 'organization',
    },
  ]

  const rows = docs.map((doc) => {
    const detailURL = `/admin/collections/contacts/${doc.id}`

    return {
      key: String(doc.id),
      cells: [
        <div className="assostack-contact-cell" key="name">
          <span aria-hidden="true" className="assostack-avatar">
            {initialsFromName(doc.displayName)}
          </span>
          <div>
            <a className="assostack-contact-cell__title" href={detailURL}>
              {doc.displayName ?? 'Sans nom'}
            </a>
            <span className="assostack-contact-cell__meta">{kindLabel(doc.kind)}</span>
          </div>
        </div>,
        doc.email ?? '—',
        doc.phone ?? '—',
        <Badge key="status" tone={doc.status === 'active' ? 'accent' : 'neutral'}>
          {statusLabel(doc.status)}
        </Badge>,
        formatDate(doc.updatedAt),
        <div className="assostack-table-actions" key="actions">
          <a href={detailURL}>Ouvrir</a>
        </div>,
      ],
    }
  })

  return (
    <main aria-labelledby="assostack-list-page-title" className="assostack-list-page">
      <AdminTopBar searchPlaceholder="Recherche globale (bientôt disponible)" />

      <PageHeader
        headingId="assostack-list-page-title"
        eyebrow="Membres & contacts"
        title="Contacts"
        description="Personnes et organisations liées à votre association."
        actions={
          hasCreatePermission ? (
            <LinkButton href={newDocumentURL ?? '/admin/collections/contacts/create'}>
              Ajouter un contact
            </LinkButton>
          ) : null
        }
      />

      <Tabs ariaLabel="Segments des contacts" tabs={tabs} />

      <FilterBar>
        <form
          action="/admin/collections/contacts"
          className="assostack-list-page__search"
          method="GET"
        >
          {statusFilter ? (
            <input name="where[status][equals]" type="hidden" value={statusFilter} />
          ) : null}
          {kindFilter ? (
            <input name="where[kind][equals]" type="hidden" value={kindFilter} />
          ) : null}
          <SearchInput
            ariaLabel="Rechercher un contact"
            defaultValue={search}
            name="search"
            placeholder="Rechercher un nom, e-mail ou téléphone"
          />
          <button type="submit">Rechercher</button>
        </form>
        <div className="assostack-list-page__filters">
          <a
            href={`${basePath}${buildQueryString(searchParams, { 'where[status][equals]': undefined, page: '1' })}`}
          >
            Tous
          </a>
          <a
            href={`${basePath}${buildQueryString(searchParams, { 'where[status][equals]': 'active', page: '1' })}`}
          >
            Actifs
          </a>
          <a
            href={`${basePath}${buildQueryString(searchParams, { 'where[status][equals]': 'archived', page: '1' })}`}
          >
            Archivés
          </a>
        </div>
      </FilterBar>

      {docs.length === 0 ? (
        <EmptyState
          title="Aucun contact pour le moment"
          description="Ajoutez une première personne ou organisation à votre répertoire."
          actionHref={
            hasCreatePermission
              ? (newDocumentURL ?? '/admin/collections/contacts/create')
              : undefined
          }
          actionLabel={hasCreatePermission ? 'Ajouter un contact' : undefined}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Liste des contacts"
            columns={[
              { key: 'name', label: 'Nom', width: 'minmax(13rem, 2.3fr)' },
              { key: 'email', label: 'E-mail', width: 'minmax(10rem, 1.4fr)' },
              { key: 'phone', label: 'Téléphone', width: 'minmax(8rem, 1fr)' },
              { key: 'status', label: 'Statut', width: 'minmax(7rem, 0.9fr)' },
              { key: 'activity', label: 'Dernière activité', width: 'minmax(9rem, 1fr)' },
              { key: 'actions', label: 'Actions', width: 'minmax(5rem, 0.8fr)' },
            ]}
            rows={rows}
          />

          <p className="assostack-list-page__note">
            Les segments « Membres » et « Partenaires » seront activés quand un lien direct et
            stable sera exposé côté modèle sans coût excessif.
          </p>

          <footer className="assostack-list-page__pagination">
            <span>
              {data?.totalDocs ?? docs.length} contacts · page {currentPage} / {totalPages}
            </span>
            <nav aria-label="Pagination des contacts">
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
