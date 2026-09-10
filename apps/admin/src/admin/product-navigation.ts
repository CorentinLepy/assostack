import type { CollectionConfig, SanitizedPermissions } from 'payload'

import { moduleRegistryByID, type ModuleID } from './module-registry'
import { canReadCollectionFromPermissions, isModuleEnabled } from './module-policy'
import { type OrganizationModules } from './modules'

const moduleLabel = (moduleID: ModuleID) => moduleRegistryByID.get(moduleID)?.label ?? moduleID
const moduleDescription = (moduleID: ModuleID) =>
  moduleRegistryByID.get(moduleID)?.description ?? ''

export const toolNavigationTitles = [
  moduleLabel('forms'),
  moduleLabel('documents'),
  moduleLabel('website'),
]

const frenchFieldLabels: Record<string, string> = {
  agreementReference: 'Référence de convention',
  contact: 'Contact',
  content: 'Contenu',
  createdBy: 'Créé par',
  description: 'Description',
  displayName: 'Nom affiché',
  endsAt: 'Date de fin',
  event: 'Événement',
  excerpt: 'Introduction',
  externalReference: 'Référence externe',
  heroImage: 'Image principale',
  key: 'Identifiant technique',
  kind: 'Type',
  level: 'Niveau de partenariat',
  membershipNumber: 'Numéro d’adhésion',
  membershipType: 'Type d’adhésion',
  name: 'Nom',
  note: 'Notes',
  partner: 'Partenaire',
  primaryContact: 'Contact principal',
  startsAt: 'Date de début',
  status: 'Statut',
  title: 'Titre',
}

const frenchOptionLabels: Record<string, string> = {
  active: 'Actif',
  archived: 'Archivé',
  cancelled: 'Annulé',
  closed: 'Fermé',
  completed: 'Terminé',
  declined: 'Refusé',
  draft: 'Brouillon',
  ended: 'Terminé',
  institutional: 'Institutionnel',
  media: 'Média',
  negotiating: 'En discussion',
  open: 'Ouvert',
  other: 'Autre',
  partner: 'Partenaire',
  paused: 'En pause',
  pending: 'En attente',
  person: 'Personne',
  prospect: 'Prospect',
  scheduled: 'Prévu',
  sponsor: 'Sponsor',
  supplier: 'Fournisseur',
  suspended: 'Suspendu',
}

export const adminGroups = {
  contacts: 'Membres & contacts',
  memberships: 'Adhésions',
  events: 'Événements',
  volunteers: 'Bénévoles',
  partners: 'Partenaires',
  forms: 'Formulaires',
  website: 'Site web',
  documents: 'Documents',
  administration: 'Administration',
} as const

export type ProductCollectionSlug =
  | 'organizations'
  | 'users'
  | 'contact-tags'
  | 'custom-field-definitions'
  | 'privacy-purposes'
  | 'membership-types'
  | 'partnership-levels'
  | 'forms'
  | 'contacts'
  | 'contact-custom-field-values'
  | 'memberships'
  | 'events'
  | 'event-registrations'
  | 'volunteer-shifts'
  | 'volunteer-assignments'
  | 'partnerships'
  | 'interactions'
  | 'integrations'
  | 'webhook-events'
  | 'notes'
  | 'tasks'
  | 'privacy-records'
  | 'form-submissions'
  | 'documents'
  | 'media'
  | 'pages'
  | 'posts'

export const collectionLabelsBySlug: Record<
  ProductCollectionSlug,
  { singular: string; plural: string }
> = {
  organizations: { singular: 'Organisation', plural: 'Organisations' },
  users: { singular: 'Utilisateur', plural: 'Utilisateurs' },
  'contact-tags': { singular: 'Catégorie de contact', plural: 'Catégories de contacts' },
  'custom-field-definitions': { singular: 'Champ personnalisé', plural: 'Champs personnalisés' },
  'privacy-purposes': { singular: 'Finalité de traitement', plural: 'Finalités de traitement' },
  'membership-types': { singular: 'Type d’adhésion', plural: 'Types d’adhésion' },
  'partnership-levels': {
    singular: 'Niveau de partenariat',
    plural: 'Niveaux de partenariat',
  },
  forms: { singular: 'Formulaire', plural: 'Formulaires' },
  contacts: { singular: 'Contact', plural: 'Contacts' },
  'contact-custom-field-values': {
    singular: 'Valeur de champ personnalisé',
    plural: 'Valeurs de champs personnalisés',
  },
  memberships: { singular: 'Adhésion', plural: 'Adhésions' },
  events: { singular: 'Événement', plural: 'Événements' },
  'event-registrations': { singular: 'Inscription', plural: 'Inscriptions' },
  'volunteer-shifts': { singular: 'Créneau bénévole', plural: 'Créneaux bénévoles' },
  'volunteer-assignments': {
    singular: 'Affectation bénévole',
    plural: 'Affectations bénévoles',
  },
  partnerships: { singular: 'Partenariat', plural: 'Partenariats' },
  interactions: { singular: 'Interaction', plural: 'Interactions' },
  integrations: { singular: 'Intégration', plural: 'Intégrations' },
  'webhook-events': { singular: 'Événement webhook', plural: 'Événements webhook' },
  notes: { singular: 'Note', plural: 'Notes' },
  tasks: { singular: 'Tâche', plural: 'Tâches' },
  'privacy-records': {
    singular: 'Historique de confidentialité',
    plural: 'Historiques de confidentialité',
  },
  'form-submissions': { singular: 'Réponse', plural: 'Réponses' },
  documents: { singular: 'Document', plural: 'Documents' },
  media: { singular: 'Média', plural: 'Médias' },
  pages: { singular: 'Page', plural: 'Pages' },
  posts: { singular: 'Publication', plural: 'Publications' },
}

export const secondaryCollectionSlugs: ProductCollectionSlug[] = [
  'contact-tags',
  'custom-field-definitions',
  'contact-custom-field-values',
  'privacy-purposes',
  'privacy-records',
  'interactions',
  'notes',
  'tasks',
  'membership-types',
  'event-registrations',
  'volunteer-assignments',
  'partnership-levels',
  'form-submissions',
  'webhook-events',
]

export const collectionGroupBySlug: Record<ProductCollectionSlug, string | false> = {
  organizations: adminGroups.administration,
  users: adminGroups.administration,
  'contact-tags': false,
  'custom-field-definitions': false,
  'privacy-purposes': false,
  'membership-types': false,
  'partnership-levels': false,
  forms: adminGroups.forms,
  contacts: adminGroups.contacts,
  'contact-custom-field-values': false,
  memberships: adminGroups.memberships,
  events: adminGroups.events,
  'event-registrations': false,
  'volunteer-shifts': adminGroups.volunteers,
  'volunteer-assignments': false,
  partnerships: adminGroups.partners,
  interactions: false,
  integrations: adminGroups.administration,
  'webhook-events': false,
  notes: false,
  tasks: false,
  'privacy-records': false,
  'form-submissions': false,
  documents: adminGroups.documents,
  media: adminGroups.website,
  pages: adminGroups.website,
  posts: adminGroups.website,
}

export type DashboardCollectionLink = {
  label: string
  collection: ProductCollectionSlug
}

export type DashboardDomainLink = {
  title: string
  description: string
  module?: ModuleID
  primary: DashboardCollectionLink
  secondary: DashboardCollectionLink[]
}

export type VisibleDashboardDomainLink = DashboardDomainLink & {
  primaryVisible: boolean
  secondary: DashboardCollectionLink[]
}

export const dashboardDomains: DashboardDomainLink[] = [
  {
    title: moduleLabel('contacts'),
    description: moduleDescription('contacts'),
    module: 'contacts',
    primary: { label: 'Ouvrir les contacts', collection: 'contacts' },
    secondary: [
      { label: 'Catégories', collection: 'contact-tags' },
      { label: 'Interactions', collection: 'interactions' },
      { label: 'Notes', collection: 'notes' },
      { label: 'Tâches', collection: 'tasks' },
    ],
  },
  {
    title: moduleLabel('memberships'),
    module: 'memberships',
    description: moduleDescription('memberships'),
    primary: { label: 'Voir les adhésions', collection: 'memberships' },
    secondary: [{ label: 'Types d’adhésion', collection: 'membership-types' }],
  },
  {
    title: moduleLabel('events'),
    module: 'events',
    description: moduleDescription('events'),
    primary: { label: 'Voir les événements', collection: 'events' },
    secondary: [{ label: 'Inscriptions', collection: 'event-registrations' }],
  },
  {
    title: moduleLabel('volunteers'),
    module: 'volunteers',
    description: moduleDescription('volunteers'),
    primary: { label: 'Voir les créneaux', collection: 'volunteer-shifts' },
    secondary: [{ label: 'Affectations', collection: 'volunteer-assignments' }],
  },
  {
    title: moduleLabel('partnerships'),
    module: 'partnerships',
    description: moduleDescription('partnerships'),
    primary: { label: 'Voir les partenariats', collection: 'partnerships' },
    secondary: [{ label: 'Niveaux', collection: 'partnership-levels' }],
  },
  {
    title: moduleLabel('forms'),
    module: 'forms',
    description: moduleDescription('forms'),
    primary: { label: 'Voir les formulaires', collection: 'forms' },
    secondary: [{ label: 'Réponses', collection: 'form-submissions' }],
  },
  {
    title: moduleLabel('website'),
    module: 'website',
    description: moduleDescription('website'),
    primary: { label: 'Modifier les pages', collection: 'pages' },
    secondary: [
      { label: 'Publications', collection: 'posts' },
      { label: 'Médias', collection: 'media' },
    ],
  },
  {
    title: moduleLabel('documents'),
    description: moduleDescription('documents'),
    module: 'documents',
    primary: { label: 'Voir les documents', collection: 'documents' },
    secondary: [],
  },
]

export const administrationLinks: DashboardCollectionLink[] = [
  { label: 'Organisation & modules', collection: 'organizations' },
  { label: 'Utilisateurs', collection: 'users' },
  { label: 'Intégrations', collection: 'integrations' },
  { label: 'Paramètres & configuration', collection: 'custom-field-definitions' },
]

export const advancedAdministrationLinks: DashboardCollectionLink[] = [
  { label: 'Finalités de traitement', collection: 'privacy-purposes' },
  { label: 'Historique de confidentialité', collection: 'privacy-records' },
  { label: 'Valeurs de champs personnalisés', collection: 'contact-custom-field-values' },
  { label: 'Journal des webhooks', collection: 'webhook-events' },
]

export const canReadCollection = (
  permissions: SanitizedPermissions | undefined,
  collection: ProductCollectionSlug,
) => canReadCollectionFromPermissions(permissions, collection)

export const filterReadableLinks = (
  permissions: SanitizedPermissions | undefined,
  links: DashboardCollectionLink[],
) => links.filter((link) => canReadCollection(permissions, link.collection))

export const getVisibleDashboardDomains = (
  permissions: SanitizedPermissions | undefined,
  modules?: Partial<OrganizationModules>,
): VisibleDashboardDomainLink[] => {
  return dashboardDomains
    .map((domain) => {
      if (!isModuleEnabled(modules, domain.module)) {
        return null
      }

      const primaryVisible = canReadCollection(permissions, domain.primary.collection)
      const secondary = filterReadableLinks(permissions, domain.secondary)

      return primaryVisible || secondary.length > 0
        ? { ...domain, primaryVisible, secondary }
        : null
    })
    .filter((domain) => domain !== null)
}

export const applyAdminProductNavigation = (
  collections: CollectionConfig[],
): CollectionConfig[] => {
  return collections.map((collection) => {
    const group = collectionGroupBySlug[collection.slug as ProductCollectionSlug]

    if (group === undefined) {
      return collection
    }

    return {
      ...collection,
      labels: collectionLabelsBySlug[collection.slug as ProductCollectionSlug] ?? collection.labels,
      fields: localizeFields(collection.fields),
      admin: {
        ...collection.admin,
        group,
      },
    }
  })
}

const localizeFields = (
  fields: CollectionConfig['fields'],
  isTopLevel = true,
): CollectionConfig['fields'] =>
  fields.map((field) => {
    if (!('name' in field)) {
      return field
    }

    const namedField = field as typeof field & {
      admin?: Record<string, unknown>
      fields?: CollectionConfig['fields']
      options?: Array<{ label?: string; value?: string }> | string[]
    }
    const name = namedField.name
    const options = namedField.options as
      Array<string | { label?: string; value?: string }> | undefined
    const localizedOptions = options
      ? options.map((option) => {
          if (typeof option === 'string') {
            return option
          }

          return {
            ...option,
            label: option.value ? (frenchOptionLabels[option.value] ?? option.label) : option.label,
          }
        })
      : namedField.options

    return {
      ...namedField,
      ...(frenchFieldLabels[name] ? { label: frenchFieldLabels[name] } : {}),
      ...(namedField.fields ? { fields: localizeFields(namedField.fields, false) } : {}),
      ...(localizedOptions ? { options: localizedOptions } : {}),
      ...(isTopLevel && name === 'key'
        ? { admin: { ...namedField.admin, position: 'sidebar' } }
        : {}),
    } as typeof field
  })
