import { describe, expect, test } from 'vitest'

import {
  administrationLinks,
  advancedAdministrationLinks,
  dashboardDomains,
  secondaryCollectionSlugs,
  collectionLabelsBySlug,
  getVisibleDashboardDomains,
  toolNavigationTitles,
  type ProductCollectionSlug,
} from '@/admin/product-navigation'
import { AssoStackIcon, AssoStackLogo, AssoStackMark } from '@/admin/AssoStackBrand'
import { defaultOrganizationModules as moduleDefaults } from '@/admin/modules'
import config from '@/payload.config'

describe('admin product experience', () => {
  test('uses French labels and product-oriented navigation groups', async () => {
    const payloadConfig = await config
    const collections = new Map(
      payloadConfig.collections?.map((collection) => [collection.slug, collection]) ?? [],
    )

    expect(collections.get('contacts')?.admin?.group).toBe('Membres & contacts')
    expect(collections.get('memberships')?.admin?.group).toBe('Adhésions')
    expect(collections.get('events')?.admin?.group).toBe('Événements')
    expect(collections.get('volunteer-shifts')?.admin?.group).toBe('Bénévoles')
    expect(collections.get('partnerships')?.admin?.group).toBe('Partenaires')
    expect(collections.get('forms')?.admin?.group).toBe('Formulaires')
    expect(collections.get('pages')?.admin?.group).toBe('Site web')
    expect(collections.get('documents')?.admin?.group).toBe('Documents')
    expect(collections.get('organizations')?.admin?.group).toBe('Administration')
    expect(collections.get('users')?.admin?.group).toBe('Administration')

    expect(collections.get('memberships')?.labels).toEqual(collectionLabelsBySlug.memberships)
    expect(collections.get('events')?.labels).toEqual(collectionLabelsBySlug.events)
    expect(collections.get('media')?.labels).toEqual(collectionLabelsBySlug.media)
    expect(collections.get('volunteer-shifts')?.admin?.description).toBe(
      'Planifiez les créneaux sur lesquels votre association a besoin de bénévoles.',
    )
    expect(collections.get('forms')?.admin?.description).toBe(
      'Créez des formulaires pour vos inscriptions, demandes ou collectes d’informations.',
    )
    expect(collections.get('contacts')?.admin?.components?.views?.list).toMatchObject({
      Component: '@/admin/contacts/ContactsListView#ContactsListView',
    })
    expect(collections.get('memberships')?.admin?.components?.views?.list).toMatchObject({
      Component: '@/admin/memberships/MembershipsListView#MembershipsListView',
    })
    expect(collections.get('events')?.admin?.components?.views?.list).toMatchObject({
      Component: '@/admin/events/EventsListView#EventsListView',
    })
  })

  test('replaces the default Payload dashboard instead of stacking above it', async () => {
    const payloadConfig = await config

    expect(payloadConfig.admin?.components?.beforeDashboard).toBeUndefined()
    expect(payloadConfig.admin?.components?.views?.dashboard).toMatchObject({
      Component: '@/admin/AssociationDashboardServer#AssociationDashboardServer',
    })
    expect(payloadConfig.admin?.components?.Nav).toBe('@/admin/AssoStackNav#AssoStackNav')
    expect(payloadConfig.admin?.components?.graphics).toMatchObject({
      Icon: '@/admin/AssoStackBrand#AssoStackIcon',
      Logo: '@/admin/AssoStackBrand#AssoStackLogo',
    })
    expect(payloadConfig.admin?.meta?.title).toBe('AssoStack')
  })

  test('exposes a vector AssoStack mark for icon and logo hooks', () => {
    const icon = AssoStackIcon() as any
    const logo = AssoStackLogo() as any
    const mark = AssoStackMark({ size: 24 }) as any

    expect(icon.type).toBe(AssoStackMark)
    expect(logo.props.className).toContain('assostack-brand--logo')
    expect(mark.type).toBe('svg')
    expect(mark.props.viewBox).toBe('0 0 32 32')
  })

  test('keeps secondary collections out of the primary sidebar and module entry points', async () => {
    const payloadConfig = await config
    const collections = new Map(
      payloadConfig.collections?.map((collection) => [collection.slug, collection]) ?? [],
    )
    const dashboardCollections = new Set(
      dashboardDomains.flatMap((domain) => [domain.primary.collection]),
    )

    for (const slug of secondaryCollectionSlugs) {
      expect(collections.get(slug)?.admin?.group).toBe(false)
      expect(dashboardCollections.has(slug)).toBe(false)
    }
  })

  test('configures Payload built-in admin translations for French', async () => {
    const payloadConfig = await config

    expect(payloadConfig.i18n?.fallbackLanguage).toBe('fr')
    expect(Object.keys(payloadConfig.i18n?.supportedLanguages ?? {})).toEqual(['fr'])
  })

  test('filters dashboard links through Payload collection read permissions', () => {
    const visibleDomains = getVisibleDashboardDomains({
      collections: {
        contacts: { read: true } as any,
        memberships: {} as any,
        'contact-tags': { read: true } as any,
      },
    })

    expect(visibleDomains.map((domain) => domain.title)).toEqual(['Membres & contacts'])
    expect(visibleDomains[0]?.primaryVisible).toBe(true)
    expect(visibleDomains[0]?.secondary).toEqual([
      { label: 'Catégories', collection: 'contact-tags' },
    ])
  })

  test('recognizes Payload dynamic read permissions', () => {
    const visibleDomains = getVisibleDashboardDomains({
      collections: {
        contacts: { read: { permission: true } } as any,
      },
    })

    expect(visibleDomains.map((domain) => domain.title)).toEqual(['Membres & contacts'])
  })

  test('hides disabled optional modules without bypassing collection permissions', () => {
    const visibleDomains = getVisibleDashboardDomains(
      {
        collections: {
          contacts: { read: true } as any,
          memberships: { read: true } as any,
          'membership-types': { read: true } as any,
          'volunteer-shifts': { read: true } as any,
          'volunteer-assignments': { read: true } as any,
        },
      },
      { ...moduleDefaults, volunteers: false },
    )

    expect(visibleDomains.map((domain) => domain.title)).toEqual([
      'Membres & contacts',
      'Adhésions',
    ])
  })

  test('defaults every optional module to enabled for existing organizations', () => {
    expect(moduleDefaults).toEqual({
      memberships: true,
      events: true,
      volunteers: true,
      partnerships: true,
      forms: true,
      website: true,
    })
  })

  test('keeps optional modules out of the universal navigation definition', () => {
    expect(dashboardDomains.map((domain) => domain.title)).toEqual(
      expect.arrayContaining(['Adhésions', 'Événements', 'Bénévoles', 'Partenaires']),
    )
    expect(secondaryCollectionSlugs).toEqual(
      expect.arrayContaining(['volunteer-assignments', 'event-registrations', 'membership-types']),
    )
  })

  test('keeps secondary resources and tools out of the management navigation', () => {
    expect(toolNavigationTitles).toEqual(['Formulaires', 'Documents', 'Site web'])
    expect(administrationLinks.map((link) => link.label)).toEqual([
      'Organisation & modules',
      'Utilisateurs',
      'Intégrations',
      'Paramètres & configuration',
    ])
    expect(secondaryCollectionSlugs).toEqual(
      expect.arrayContaining(['form-submissions', 'webhook-events', 'privacy-purposes']),
    )
  })

  test('keeps every product collection reachable from navigation, dashboard or administration', async () => {
    const payloadConfig = await config
    const allSlugs = (payloadConfig.collections
      ?.map((collection) => collection.slug)
      .filter((slug) => !slug.startsWith('payload-')) ?? []) as ProductCollectionSlug[]

    const reachable = new Set<ProductCollectionSlug>([
      ...dashboardDomains.flatMap((domain) => [
        domain.primary.collection,
        ...domain.secondary.map((link) => link.collection),
      ]),
      ...administrationLinks.map((link) => link.collection),
      ...advancedAdministrationLinks.map((link) => link.collection),
    ])

    for (const slug of allSlugs) {
      expect(reachable.has(slug)).toBe(true)
    }
  })

  test('keeps dashboard shortcuts descriptive instead of displaying fabricated metrics', () => {
    expect(dashboardDomains.map((domain) => domain.primary.label)).toEqual(
      expect.arrayContaining([
        'Ouvrir les contacts',
        'Voir les adhésions',
        'Voir les événements',
        'Voir les documents',
      ]),
    )
  })
})
