import type {
  PublicMedia,
  PublicOrganization,
  PublicPage,
  PublicPageSummary,
  PublicPost,
  PublicPostSummary,
  PublicSEO,
} from '../../../../packages/contracts/src/public-content'

const asRecord = (value: unknown): Record<string, any> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

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

const serializeSEO = (value: unknown, serverURL: string): PublicSEO => {
  const meta = asRecord(value)

  return {
    description: asString(meta?.description),
    image: serializePublicMedia(meta?.image, serverURL),
    title: asString(meta?.title),
  }
}

export const serializePublicOrganization = (value: unknown): PublicOrganization => {
  const organization = asRecord(value) ?? {}
  const settings = asRecord(organization.settings) ?? {}
  const publicContact = asRecord(settings.publicContact) ?? {}
  const website = asRecord(settings.website) ?? {}

  return {
    name: asString(organization.name) ?? '',
    slug: asString(organization.slug) ?? '',
    locale: asString(settings.locale) ?? 'en',
    timezone: asString(settings.timezone) ?? 'UTC',
    publicContact: {
      email: asString(publicContact.email),
      phone: asString(publicContact.phone),
    },
    website: {
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
