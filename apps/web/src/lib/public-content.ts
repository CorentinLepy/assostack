import {
  PUBLIC_CONTENT_API_VERSION,
  type PublicEnvelope,
  type PublicListEnvelope,
  type PublicOrganization,
  type PublicPage,
  type PublicPageSummary,
  type PublicPost,
  type PublicPostSummary,
} from '../../../../packages/contracts/src/public-content'

const configuredAPIURL = import.meta.env.ASSOSTACK_API_URL?.trim()
const configuredOrganization = import.meta.env.ASSOSTACK_ORGANIZATION?.trim()

if (Boolean(configuredAPIURL) !== Boolean(configuredOrganization)) {
  throw new Error(
    'ASSOSTACK_API_URL and ASSOSTACK_ORGANIZATION must either both be set or both be absent.',
  )
}

export const publicContentConfiguration = {
  apiURL: configuredAPIURL ? configuredAPIURL.replace(/\/+$/, '') : null,
  organization: configuredOrganization || null,
}

export const isPublicContentConfigured = (): boolean =>
  Boolean(publicContentConfiguration.apiURL && publicContentConfiguration.organization)

const request = async <T extends { apiVersion: string }>(path: string): Promise<T> => {
  const { apiURL } = publicContentConfiguration
  if (!apiURL) {
    throw new Error('ASSOSTACK_API_URL is required to load organization content.')
  }

  const response = await fetch(`${apiURL}${path}`, {
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`AssoStack public content request failed with HTTP ${response.status}.`)
  }

  const body = (await response.json()) as T
  if (body.apiVersion !== PUBLIC_CONTENT_API_VERSION) {
    throw new Error(
      `Unsupported AssoStack public content API version: ${String(body.apiVersion)}.`,
    )
  }

  return body
}

const organizationPath = (): string => {
  const organization = publicContentConfiguration.organization
  if (!organization) {
    throw new Error('ASSOSTACK_ORGANIZATION is required to load organization content.')
  }

  return `/api/public/v1/${encodeURIComponent(organization)}`
}

export const getPublicOrganization = async (): Promise<PublicOrganization> => {
  const response = await request<PublicEnvelope<PublicOrganization>>(`${organizationPath()}/site`)
  return response.data
}

export const listPublicPages = async (): Promise<PublicPageSummary[]> => {
  const response = await request<PublicListEnvelope<PublicPageSummary>>(
    `${organizationPath()}/pages?limit=50`,
  )
  return response.data
}

export const getPublicPage = async (slug: string): Promise<PublicPage> => {
  const response = await request<PublicEnvelope<PublicPage>>(
    `${organizationPath()}/pages/${encodeURIComponent(slug)}`,
  )
  return response.data
}

export const listPublicPosts = async (): Promise<PublicPostSummary[]> => {
  const response = await request<PublicListEnvelope<PublicPostSummary>>(
    `${organizationPath()}/posts?limit=50`,
  )
  return response.data
}

export const getPublicPost = async (slug: string): Promise<PublicPost> => {
  const response = await request<PublicEnvelope<PublicPost>>(
    `${organizationPath()}/posts/${encodeURIComponent(slug)}`,
  )
  return response.data
}
