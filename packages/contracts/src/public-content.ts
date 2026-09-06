export const PUBLIC_CONTENT_API_VERSION = 'v1' as const

export type PublicContentAPIVersion = typeof PUBLIC_CONTENT_API_VERSION

export type PublicMedia = {
  alt: string
  height: number | null
  url: string
  width: number | null
}

export type PublicAction = {
  external: boolean
  href: string
  label: string
  newTab: boolean
}

export type PublicNavigationItem = PublicAction

export type PublicSiteTheme = {
  colors: {
    accent: string
    background: string
    muted: string
    primary: string
    surface: string
    text: string
  }
  fontFamily: 'system' | 'humanist' | 'serif' | 'mono'
  radius: 'none' | 'small' | 'medium' | 'large'
}

export type PublicOrganization = {
  name: string
  slug: string
  locale: string
  timezone: string
  identity: {
    logo: PublicMedia | null
    siteTitle: string
    tagline: string | null
  }
  navigation: PublicNavigationItem[]
  publicContact: {
    email: string | null
    phone: string | null
  }
  theme: PublicSiteTheme
  website: {
    navigationMode: 'automatic' | 'manual'
    primaryDomain: string | null
  }
}

export type PublicSEO = {
  description: string | null
  image: PublicMedia | null
  title: string | null
}

export type PublicPageSummary = {
  publishedAt: string | null
  slug: string
  summary: string | null
  title: string
  updatedAt: string
}

export type PublicHeroSection = {
  type: 'hero'
  alignment: 'left' | 'center'
  action: PublicAction | null
  eyebrow: string | null
  heading: string
  image: PublicMedia | null
  text: string | null
}

export type PublicRichTextSection = {
  type: 'richText'
  content: Record<string, unknown>
}

export type PublicCalloutSection = {
  type: 'callout'
  action: PublicAction | null
  heading: string
  text: string | null
  tone: 'neutral' | 'accent'
}

export type PublicCardItem = {
  action: PublicAction | null
  image: PublicMedia | null
  text: string | null
  title: string
}

export type PublicCardsSection = {
  type: 'cards'
  heading: string | null
  intro: string | null
  items: PublicCardItem[]
}

export type PublicPageSection =
  | PublicHeroSection
  | PublicRichTextSection
  | PublicCalloutSection
  | PublicCardsSection

export type PublicPage = PublicPageSummary & {
  content: Record<string, unknown>
  meta: PublicSEO
  sections: PublicPageSection[]
}

export type PublicPostSummary = {
  excerpt: string | null
  heroImage: PublicMedia | null
  publishedAt: string | null
  slug: string
  title: string
  updatedAt: string
}

export type PublicPost = PublicPostSummary & {
  content: Record<string, unknown>
  meta: PublicSEO
}

export type PublicEnvelope<T> = {
  apiVersion: PublicContentAPIVersion
  data: T
}

export type PublicListEnvelope<T> = PublicEnvelope<T[]> & {
  pagination: {
    hasNextPage: boolean
    limit: number
    page: number
    totalDocs: number
    totalPages: number
  }
}

export type PublicErrorEnvelope = {
  apiVersion: PublicContentAPIVersion
  error: {
    code: 'not_found' | 'invalid_request'
    message: string
  }
}
