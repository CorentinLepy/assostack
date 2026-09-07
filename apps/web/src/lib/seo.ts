import type {
  PublicMedia,
  PublicOrganization,
} from '../../../../packages/contracts/src/public-content'

const HTTP_PROTOCOLS = new Set(['http:', 'https:'])

export const getPublicOrigin = (organization: PublicOrganization): string | null => {
  const configured = organization.website.primaryDomain?.trim()
  if (!configured) {
    return null
  }

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(configured)
    ? configured
    : `https://${configured}`

  try {
    const url = new URL(candidate)
    if (!HTTP_PROTOCOLS.has(url.protocol) || !url.hostname) {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}

export const getCanonicalURL = (
  organization: PublicOrganization,
  pathname: string,
): string | null => {
  const origin = getPublicOrigin(organization)
  if (!origin) {
    return null
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return new URL(normalizedPath, `${origin}/`).toString()
}

export const getAbsoluteMediaURL = (
  organization: PublicOrganization,
  media: PublicMedia | null | undefined,
): string | null => {
  if (!media?.url) {
    return null
  }

  try {
    const absolute = new URL(media.url)
    return HTTP_PROTOCOLS.has(absolute.protocol) ? absolute.toString() : null
  } catch {
    const origin = getPublicOrigin(organization)
    if (!origin) {
      return null
    }

    try {
      return new URL(media.url, `${origin}/`).toString()
    } catch {
      return null
    }
  }
}

export const xmlEscape = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
