export type ModuleCategory =
  'core' | 'engagement' | 'operations' | 'communication' | 'finance' | 'website'

export type ModulePrimaryDestination =
  { kind: 'collection'; value: string } | { kind: 'route'; value: string }

export type AssoStackModuleDefinition = {
  id: string
  label: string
  description: string
  category: ModuleCategory
  isCore: boolean
  dependencies: string[]
  primaryDestination: ModulePrimaryDestination | null
  visibleInDashboard: boolean
  visibleInNavigation: boolean
  configurablePerOrganization: boolean
  capabilities?: string[]
}

export const moduleRegistry = [
  {
    id: 'contacts',
    label: 'Membres & contacts',
    description: 'Centralisez les personnes et structures liées à votre association.',
    category: 'core',
    isCore: true,
    dependencies: [],
    primaryDestination: { kind: 'collection', value: 'contacts' },
    visibleInDashboard: true,
    visibleInNavigation: true,
    configurablePerOrganization: false,
    capabilities: ['crm.identity', 'crm.tags'],
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Conservez vos documents internes et administratifs.',
    category: 'core',
    isCore: true,
    dependencies: [],
    primaryDestination: { kind: 'collection', value: 'documents' },
    visibleInDashboard: true,
    visibleInNavigation: true,
    configurablePerOrganization: false,
    capabilities: ['document.storage'],
  },
  {
    id: 'administration',
    label: 'Administration',
    description: 'Gérez organisation, utilisateurs et configuration avancée.',
    category: 'core',
    isCore: true,
    dependencies: [],
    primaryDestination: { kind: 'collection', value: 'organizations' },
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
    capabilities: ['tenant.settings', 'user.access'],
  },
  {
    id: 'memberships',
    label: 'Adhésions',
    description: 'Suivez les adhésions, statuts et renouvellements.',
    category: 'engagement',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: { kind: 'collection', value: 'memberships' },
    visibleInDashboard: true,
    visibleInNavigation: true,
    configurablePerOrganization: true,
  },
  {
    id: 'events',
    label: 'Événements',
    description: 'Planifiez événements, inscriptions et organisation.',
    category: 'engagement',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: { kind: 'collection', value: 'events' },
    visibleInDashboard: true,
    visibleInNavigation: true,
    configurablePerOrganization: true,
  },
  {
    id: 'volunteers',
    label: 'Bénévoles',
    description: 'Planifiez les créneaux et affectations bénévoles.',
    category: 'operations',
    isCore: false,
    dependencies: ['contacts', 'events'],
    primaryDestination: { kind: 'collection', value: 'volunteer-shifts' },
    visibleInDashboard: true,
    visibleInNavigation: true,
    configurablePerOrganization: true,
  },
  {
    id: 'partnerships',
    label: 'Partenaires',
    description: 'Suivez vos partenaires, sponsors et soutiens.',
    category: 'communication',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: { kind: 'collection', value: 'partnerships' },
    visibleInDashboard: true,
    visibleInNavigation: true,
    configurablePerOrganization: true,
  },
  {
    id: 'forms',
    label: 'Formulaires',
    description: 'Créez des formulaires et suivez les réponses.',
    category: 'operations',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: { kind: 'collection', value: 'forms' },
    visibleInDashboard: true,
    visibleInNavigation: true,
    configurablePerOrganization: true,
  },
  {
    id: 'website',
    label: 'Site web',
    description: 'Publiez pages, actualités et médias publics.',
    category: 'website',
    isCore: false,
    dependencies: [],
    primaryDestination: { kind: 'collection', value: 'pages' },
    visibleInDashboard: true,
    visibleInNavigation: true,
    configurablePerOrganization: true,
  },
  {
    id: 'communications',
    label: 'Communications',
    description: 'Diffusez messages, campagnes et information adhérents.',
    category: 'communication',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
  {
    id: 'donations',
    label: 'Dons',
    description: 'Collectez et suivez les dons.',
    category: 'finance',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
  {
    id: 'payments',
    label: 'Paiements',
    description: 'Centralisez les paiements et rapprochements.',
    category: 'finance',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
  {
    id: 'treasury',
    label: 'Trésorerie',
    description: 'Pilotez les flux et équilibres financiers.',
    category: 'finance',
    isCore: false,
    dependencies: ['payments'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
  {
    id: 'groups',
    label: 'Groupes & sections',
    description: 'Structurez vos équipes, sections et collectifs.',
    category: 'operations',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
  {
    id: 'projects',
    label: 'Projets',
    description: 'Organisez actions, objectifs et suivi.',
    category: 'operations',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
  {
    id: 'bookings',
    label: 'Réservations & ressources',
    description: 'Réservez des créneaux, salles ou ressources partagées.',
    category: 'operations',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
  {
    id: 'licenses',
    label: 'Licences & certificats',
    description: 'Gérez licences, certificats et échéances.',
    category: 'operations',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
  {
    id: 'campaigns',
    label: 'Campagnes',
    description: 'Pilotez vos campagnes d’adhésion et d’engagement.',
    category: 'communication',
    isCore: false,
    dependencies: ['contacts'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
  {
    id: 'ticketing',
    label: 'Billetterie',
    description: 'Gérez les billets et l’accès à vos événements.',
    category: 'engagement',
    isCore: false,
    dependencies: ['events', 'payments'],
    primaryDestination: null,
    visibleInDashboard: false,
    visibleInNavigation: false,
    configurablePerOrganization: false,
  },
] as const satisfies readonly AssoStackModuleDefinition[]

export type ModuleID = (typeof moduleRegistry)[number]['id']
export type ConfigurableOptionalModuleID =
  'memberships' | 'events' | 'volunteers' | 'partnerships' | 'forms' | 'website'

export const moduleRegistryByID = new Map<ModuleID, AssoStackModuleDefinition>(
  moduleRegistry.map((module) => [module.id, module]),
)

export const coreModuleIDs: readonly ModuleID[] = ['contacts', 'documents', 'administration']

export const configurableOptionalModuleIDs: readonly ConfigurableOptionalModuleID[] = [
  'memberships',
  'events',
  'volunteers',
  'partnerships',
  'forms',
  'website',
]

export const configurableOptionalModuleOptions = configurableOptionalModuleIDs.map((id) => {
  const module = moduleRegistryByID.get(id)

  return {
    label: module?.label ?? id,
    value: id,
  }
})
