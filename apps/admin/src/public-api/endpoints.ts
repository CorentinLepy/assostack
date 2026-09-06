import { headersWithCors, type Endpoint, type PayloadRequest } from 'payload'

import {
  PUBLIC_CONTENT_API_VERSION,
  type PublicEnvelope,
  type PublicErrorEnvelope,
  type PublicListEnvelope,
  type PublicOrganization,
  type PublicPage,
  type PublicPageSummary,
  type PublicPost,
  type PublicPostSummary,
} from '../../../../packages/contracts/src/public-content'
import {
  serializePublicOrganization,
  serializePublicPage,
  serializePublicPageSummary,
  serializePublicPost,
  serializePublicPostSummary,
} from './serializers'

const CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
const NOT_FOUND_CACHE_CONTROL = 'public, max-age=30, s-maxage=30'

const routeParam = (req: PayloadRequest, name: string): string | null => {
  const value = req.routeParams?.[name]
  return typeof value === 'string' && value.length > 0 ? value : null
}

const responseHeaders = (req: PayloadRequest, cacheControl = CACHE_CONTROL): Headers =>
  headersWithCors({
    headers: new Headers({
      'Cache-Control': cacheControl,
    }),
    req,
  })

const jsonResponse = <T>(req: PayloadRequest, data: T, status = 200, cacheControl?: string) =>
  Response.json(data, {
    status,
    headers: responseHeaders(req, cacheControl),
  })

const notFound = (req: PayloadRequest, message = 'Resource not found') => {
  const body: PublicErrorEnvelope = {
    apiVersion: PUBLIC_CONTENT_API_VERSION,
    error: {
      code: 'not_found',
      message,
    },
  }

  return jsonResponse(req, body, 404, NOT_FOUND_CACHE_CONTROL)
}

const invalidRequest = (req: PayloadRequest, message: string) => {
  const body: PublicErrorEnvelope = {
    apiVersion: PUBLIC_CONTENT_API_VERSION,
    error: {
      code: 'invalid_request',
      message,
    },
  }

  return jsonResponse(req, body, 400, 'no-store')
}

const findPublicOrganization = async (req: PayloadRequest, organizationSlug: string) => {
  const result = await req.payload.find({
    collection: 'organizations',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        {
          slug: {
            equals: organizationSlug,
          },
        },
        {
          status: {
            equals: 'active',
          },
        },
      ],
    },
  })

  const organization = result.docs[0]
  if (!organization) {
    return null
  }

  const websiteEnabled = (organization as any).settings?.website?.enabled
  return websiteEnabled === false ? null : organization
}

const parsePagination = (req: PayloadRequest) => {
  const url = new URL(req.url ?? 'http://localhost')
  const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10)
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '20', 10)

  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 50)
    : 20

  return { limit, page }
}

export const publicSiteEndpoint: Endpoint = {
  path: '/public/v1/:organization/site',
  method: 'get',
  handler: async (req) => {
    const organizationSlug = routeParam(req, 'organization')
    if (!organizationSlug) {
      return invalidRequest(req, 'Organization slug is required')
    }

    const organization = await findPublicOrganization(req, organizationSlug)
    if (!organization) {
      return notFound(req)
    }

    const body: PublicEnvelope<PublicOrganization> = {
      apiVersion: PUBLIC_CONTENT_API_VERSION,
      data: serializePublicOrganization(organization, req.payload.config.serverURL ?? ''),
    }

    return jsonResponse(req, body)
  },
}

export const publicPagesEndpoint: Endpoint = {
  path: '/public/v1/:organization/pages',
  method: 'get',
  handler: async (req) => {
    const organizationSlug = routeParam(req, 'organization')
    if (!organizationSlug) {
      return invalidRequest(req, 'Organization slug is required')
    }

    const organization = await findPublicOrganization(req, organizationSlug)
    if (!organization) {
      return notFound(req)
    }

    const { limit, page } = parsePagination(req)
    const pages = await req.payload.find({
      collection: 'pages',
      depth: 0,
      draft: false,
      limit,
      page,
      overrideAccess: true,
      sort: 'slug',
      where: {
        and: [
          {
            organization: {
              equals: organization.id,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
    })

    const body: PublicListEnvelope<PublicPageSummary> = {
      apiVersion: PUBLIC_CONTENT_API_VERSION,
      data: pages.docs.map(serializePublicPageSummary),
      pagination: {
        hasNextPage: pages.hasNextPage,
        limit: pages.limit,
        page: pages.page ?? page,
        totalDocs: pages.totalDocs,
        totalPages: pages.totalPages,
      },
    }

    return jsonResponse(req, body)
  },
}

export const publicPageEndpoint: Endpoint = {
  path: '/public/v1/:organization/pages/:slug',
  method: 'get',
  handler: async (req) => {
    const organizationSlug = routeParam(req, 'organization')
    const pageSlug = routeParam(req, 'slug')
    if (!organizationSlug || !pageSlug) {
      return invalidRequest(req, 'Organization and page slugs are required')
    }

    const organization = await findPublicOrganization(req, organizationSlug)
    if (!organization) {
      return notFound(req)
    }

    const pages = await req.payload.find({
      collection: 'pages',
      depth: 1,
      draft: false,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          {
            organization: {
              equals: organization.id,
            },
          },
          {
            slug: {
              equals: pageSlug,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
    })

    const page = pages.docs[0]
    if (!page) {
      return notFound(req)
    }

    const body: PublicEnvelope<PublicPage> = {
      apiVersion: PUBLIC_CONTENT_API_VERSION,
      data: serializePublicPage(page, req.payload.config.serverURL ?? ''),
    }

    return jsonResponse(req, body)
  },
}

export const publicPostsEndpoint: Endpoint = {
  path: '/public/v1/:organization/posts',
  method: 'get',
  handler: async (req) => {
    const organizationSlug = routeParam(req, 'organization')
    if (!organizationSlug) {
      return invalidRequest(req, 'Organization slug is required')
    }

    const organization = await findPublicOrganization(req, organizationSlug)
    if (!organization) {
      return notFound(req)
    }

    const { limit, page } = parsePagination(req)
    const posts = await req.payload.find({
      collection: 'posts',
      depth: 1,
      draft: false,
      limit,
      page,
      overrideAccess: true,
      sort: '-publishedAt',
      where: {
        and: [
          {
            organization: {
              equals: organization.id,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
    })

    const body: PublicListEnvelope<PublicPostSummary> = {
      apiVersion: PUBLIC_CONTENT_API_VERSION,
      data: posts.docs.map((post) =>
        serializePublicPostSummary(post, req.payload.config.serverURL ?? ''),
      ),
      pagination: {
        hasNextPage: posts.hasNextPage,
        limit: posts.limit,
        page: posts.page ?? page,
        totalDocs: posts.totalDocs,
        totalPages: posts.totalPages,
      },
    }

    return jsonResponse(req, body)
  },
}

export const publicPostEndpoint: Endpoint = {
  path: '/public/v1/:organization/posts/:slug',
  method: 'get',
  handler: async (req) => {
    const organizationSlug = routeParam(req, 'organization')
    const postSlug = routeParam(req, 'slug')
    if (!organizationSlug || !postSlug) {
      return invalidRequest(req, 'Organization and post slugs are required')
    }

    const organization = await findPublicOrganization(req, organizationSlug)
    if (!organization) {
      return notFound(req)
    }

    const posts = await req.payload.find({
      collection: 'posts',
      depth: 1,
      draft: false,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          {
            organization: {
              equals: organization.id,
            },
          },
          {
            slug: {
              equals: postSlug,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
    })

    const post = posts.docs[0]
    if (!post) {
      return notFound(req)
    }

    const body: PublicEnvelope<PublicPost> = {
      apiVersion: PUBLIC_CONTENT_API_VERSION,
      data: serializePublicPost(post, req.payload.config.serverURL ?? ''),
    }

    return jsonResponse(req, body)
  },
}

export const publicContentEndpoints: Endpoint[] = [
  publicSiteEndpoint,
  publicPagesEndpoint,
  publicPageEndpoint,
  publicPostsEndpoint,
  publicPostEndpoint,
]
