import type {
  PublicAction,
  PublicCardItem,
  PublicMedia,
  PublicNavigationItem,
  PublicOrganization,
  PublicPage,
  PublicPageSection,
  PublicPageSummary,
  PublicPost,
  PublicPostSummary,
  PublicSEO,
  PublicSiteTheme,
} from '../../../../packages/contracts/src/public-content'

const asRecord = (value: unknown): Record<string, any> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const relationshipID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }

  const record = asRecord(value)
  return typeof record?.id === 'number' || typeof record?.id === 'string' ? record.id : null
}

const sameRelationshipID = (left: unknown, right: unknown): boolean => {
  const leftID = relationshipID(left)
  const rightID = relationshipID(right)

  return leftID !== null && rightID !== null && String(leftID) === String(rightID)
}

const resolveMediaURL = (url: string, serverURL: string): string => {
  try {
    return new URL(url, serverURL).toString()
  } catch {
    return url
  }
}

export const serializePublicMedia = (value: unknown, serverURL: string): PublicMedia | null => {
  const media = asRecord(value)
  if (!media) {
    return null
  }

  const url = asString(media.url)
  const alt = asString(media.alt)
  if (!url || !alt) {
    return null
  }

  return {
    alt,
    height: asNumber(media.height),
    url: resolveMediaURL(url, serverURL),
    width: asNumber(media.width),
  }
}

const serializeOwnedMedia = (
  value: unknown,
  organizationID: unknown,
  serverURL: string,
): PublicMedia | null => {
  const media = asRecord(value)
  if (!media || !sameRelationshipID(media.organization, organizationID)) {
    return null
  }

  return serializePublicMedia(media, serverURL)
}

const serializeSEO = (value: unknown, serverURL: string): PublicSEO => {
  const meta = asRecord(value)

  return {
    description: asString(meta?.description),
    image: serializePublicMedia(meta?.image, serverURL),
    title: asString(meta?.title),
  }
}

const safeExternalURL = (value: unknown): string | null => {
  const raw = asString(value)
  if (!raw) {
    return null
  }

  try {
    const url = new URL(raw)
    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:') ||
      url.username.length > 0 ||
      url.password.length > 0
    ) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}

const serializeAction = (value: unknown, organizationID: unknown): PublicAction | null => {
  const action = asRecord(value)
  const label = asString(action?.label)
  if (!action || !label) {
    return null
  }

  if (action.kind === 'external') {
    const href = safeExternalURL(action.url)
    if (!href) {
      return null
    }

    return {
      external: true,
      href,
      label,
      newTab: action.newTab === true,
    }
  }

  const page = asRecord(action.page)
  const slug = asString(page?.slug)
  if (
    !page ||
    !slug ||
    page._status !== 'published' ||
    !sameRelationshipID(page.organization, organizationID)
  ) {
    return null
  }

  return {
    external: false,
    href: slug === 'home' ? '/' : `/${slug}`,
    label,
    newTab: false,
  }
}

const serializeNavigation = (
  value: unknown,
  organizationID: unknown,
): PublicNavigationItem[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => serializeAction(item, organizationID))
    .filter((item): item is PublicNavigationItem => item !== null)
}

const serializeCards = (
  value: unknown,
  organizationID: unknown,
  serverURL: string,
): PublicCardItem[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const cards: PublicCardItem[] = []

  for (const rawCard of value) {
    const card = asRecord(rawCard)
    const title = asString(card?.title)
    if (!card || !title) {
      continue
    }

    cards.push({
      action: serializeAction(card.action, organizationID),
      image: serializeOwnedMedia(card.image, organizationID, serverURL),
      text: asString(card.text),
      title,
    })
  }

  return cards
}

const serializePageSections = (
  value: unknown,
  organizationID: unknown,
  serverURL: string,
): PublicPageSection[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const sections: PublicPageSection[] = []

  for (const rawSection of value) {
    const section = asRecord(rawSection)
    if (!section) {
      continue
    }

    if (section.blockType === 'hero') {
      const heading = asString(section.heading)
      if (!heading) {
        continue
      }

      sections.push({
        type: 'hero',
        alignment: section.alignment === 'center' ? 'center' : 'left',
        action: serializeAction(section.action, organizationID),
        eyebrow: asString(section.eyebrow),
        heading,
        image: serializeOwnedMedia(section.image, organizationID, serverURL),
        text: asString(section.text),
      })
      continue
    }

    if (section.blockType === 'richText') {
      sections.push({
        type: 'richText',
        content: asRecord(section.content) ?? {},
      })
      continue
    }

    if (section.blockType === 'callout') {
      const heading = asString(section.heading)
      if (!heading) {
        continue
      }

      sections.push({
        type: 'callout',
        action: serializeAction(section.action, organizationID),
        heading,
        text: asString(section.text),
        tone: section.tone === 'accent' ? 'accent' : 'neutral',
      })
      continue
    }

    if (section.blockType === 'cards') {
      const items = serializeCards(section.items, organizationID, serverURL)
      if (items.length === 0) {
        continue
      }

      sections.push({
        type: 'cards',
        heading: asString(section.heading),
        intro: asString(section.intro),
        items,
      })
    }
  }

  return sections
}

const defaultTheme: PublicSiteTheme = {
  colors: {
    accent: '#2563EB',
    background: '#FBFBF9',
    muted: '#6B7280',
    primary: '#161616',
    surface: '#F7F7F5',
    text: '#161616',
  },
  fontFamily: 'system',
  radius: 'medium',
}

const colorOrDefault = (value: unknown, fallback: string): string => {
  const color = asString(value)
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : fallback
}

const serializeTheme = (value: unknown): PublicSiteTheme => {
  const theme = asRecord(value) ?? {}
  const fontFamily = ['system', 'humanist', 'serif', 'mono'].includes(theme.fontFamily)
    ? (theme.fontFamily as PublicSiteTheme['fontFamily'])
    : defaultTheme.fontFamily
  const radius = ['none', 'small', 'medium', 'large'].includes(theme.radius)
    ? (theme.radius as PublicSiteTheme['radius'])
    : defaultTheme.radius

  return {
    colors: {
      accent: colorOrDefault(theme.accentColor, defaultTheme.colors.accent),
      background: colorOrDefault(theme.backgroundColor, defaultTheme.colors.background),
      muted: colorOrDefault(theme.mutedColor, defaultTheme.colors.muted),
      primary: colorOrDefault(theme.primaryColor, defaultTheme.colors.primary),
      surface: colorOrDefault(theme.surfaceColor, defaultTheme.colors.surface),
      text: colorOrDefault(theme.textColor, defaultTheme.colors.text),
    },
    fontFamily,
    radius,
  }
}

export const serializePublicOrganization = (
  value: unknown,
  serverURL: string,
): PublicOrganization => {
  const organization = asRecord(value) ?? {}
  const settings = asRecord(organization.settings) ?? {}
  const publicContact = asRecord(settings.publicContact) ?? {}
  const website = asRecord(settings.website) ?? {}
  const name = asString(organization.name) ?? ''
  const navigationMode = website.navigationMode === 'manual' ? 'manual' : 'automatic'

  return {
    name,
    slug: asString(organization.slug) ?? '',
    locale: asString(settings.locale) ?? 'en',
    timezone: asString(settings.timezone) ?? 'UTC',
    identity: {
      logo: serializeOwnedMedia(website.logo, organization.id, serverURL),
      siteTitle: asString(website.siteTitle) ?? name,
      tagline: asString(website.tagline),
    },
    navigation: navigationMode === 'manual'
      ? serializeNavigation(website.navigation, organization.id)
      : [],
    publicContact: {
      email: asString(publicContact.email),
      phone: asString(publicContact.phone),
    },
    theme: serializeTheme(website.theme),
    website: {
      navigationMode,
      primaryDomain: asString(website.primaryDomain),
    },
  }
}

export const serializePublicPageSummary = (value: unknown): PublicPageSummary => {
  const page = asRecord(value) ?? {}

  return {
    publishedAt: asString(page.publishedAt),
    slug: asString(page.slug) ?? '',
    summary: asString(page.summary),
    title: asString(page.title) ?? '',
    updatedAt: asString(page.updatedAt) ?? '',
  }
}

export const serializePublicPage = (value: unknown, serverURL: string): PublicPage => {
  const page = asRecord(value) ?? {}

  return {
    ...serializePublicPageSummary(page),
    content: asRecord(page.content) ?? {},
    meta: serializeSEO(page.meta, serverURL),
    sections: serializePageSections(page.sections, page.organization, serverURL),
  }
}

export const serializePublicPostSummary = (
  value: unknown,
  serverURL: string,
): PublicPostSummary => {
  const post = asRecord(value) ?? {}

  return {
    excerpt: asString(post.excerpt),
    heroImage: serializePublicMedia(post.heroImage, serverURL),
    publishedAt: asString(post.publishedAt),
    slug: asString(post.slug) ?? '',
    title: asString(post.title) ?? '',
    updatedAt: asString(post.updatedAt) ?? '',
  }
}

export const serializePublicPost = (value: unknown, serverURL: string): PublicPost => {
  const post = asRecord(value) ?? {}

  return {
    ...serializePublicPostSummary(post, serverURL),
    content: asRecord(post.content) ?? {},
    meta: serializeSEO(post.meta, serverURL),
  }
}
