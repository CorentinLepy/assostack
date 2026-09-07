import type { APIRoute } from 'astro'

import {
  getPublicOrganization,
  isPublicContentConfigured,
  listPublicPages,
  listPublicPosts,
} from '../lib/public-content'
import { getCanonicalURL, getPublicOrigin, xmlEscape } from '../lib/seo'

export const prerender = true

type SitemapEntry = {
  lastmod?: string | null
  loc: string
}

const renderEntry = ({ lastmod, loc }: SitemapEntry): string => {
  const lastmodTag = lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ''
  return `<url><loc>${xmlEscape(loc)}</loc>${lastmodTag}</url>`
}

export const GET: APIRoute = async () => {
  let entries: SitemapEntry[] = []

  if (isPublicContentConfigured()) {
    const [organization, pages, posts] = await Promise.all([
      getPublicOrganization(),
      listPublicPages(),
      listPublicPosts(),
    ])

    if (getPublicOrigin(organization)) {
      const home = pages.find((page) => page.slug === 'home')
      const homeURL = getCanonicalURL(organization, '/')
      if (homeURL) {
        entries.push({
          loc: homeURL,
          lastmod: home?.updatedAt ?? null,
        })
      }

      entries.push(
        ...pages
          .filter((page) => page.slug !== 'home')
          .flatMap((page) => {
            const loc = getCanonicalURL(organization, `/${page.slug}`)
            return loc ? [{ loc, lastmod: page.updatedAt }] : []
          }),
      )

      const newsURL = getCanonicalURL(organization, '/news')
      if (newsURL) {
        const latestPostUpdate = posts
          .map((post) => post.updatedAt)
          .filter(Boolean)
          .sort()
          .at(-1)
        entries.push({
          loc: newsURL,
          lastmod: latestPostUpdate ?? null,
        })
      }

      entries.push(
        ...posts.flatMap((post) => {
          const loc = getCanonicalURL(organization, `/news/${post.slug}`)
          return loc ? [{ loc, lastmod: post.updatedAt }] : []
        }),
      )
    }
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderEntry),
    '</urlset>',
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
