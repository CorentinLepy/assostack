import type { APIRoute } from 'astro'

import {
  getPublicOrganization,
  isPublicContentConfigured,
  listPublicPosts,
} from '../../lib/public-content'
import { getPublicCopy } from '../../lib/public-copy'
import { getCanonicalURL, xmlEscape } from '../../lib/seo'

export const prerender = true

const asRFC822 = (value: string | null): string | null => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toUTCString()
}

export const GET: APIRoute = async () => {
  let siteTitle = 'AssoStack'
  let description = 'Public news feed.'
  let channelURL = '/news'
  let feedURL = '/news/rss.xml'
  let language = 'en'
  let items: string[] = []

  if (isPublicContentConfigured()) {
    const [organization, posts] = await Promise.all([
      getPublicOrganization(),
      listPublicPosts(),
    ])
    const copy = getPublicCopy(organization.locale)

    siteTitle = organization.identity.siteTitle
    description = copy.newsDescription
    language = organization.locale
    channelURL = getCanonicalURL(organization, '/news') ?? '/news'
    feedURL = getCanonicalURL(organization, '/news/rss.xml') ?? '/news/rss.xml'

    items = posts.flatMap((post) => {
      const link = getCanonicalURL(organization, `/news/${post.slug}`)
      if (!link) {
        return []
      }

      const pubDate = asRFC822(post.publishedAt)
      return [
        [
          '<item>',
          `<title>${xmlEscape(post.title)}</title>`,
          `<link>${xmlEscape(link)}</link>`,
          `<guid isPermaLink="true">${xmlEscape(link)}</guid>`,
          post.excerpt ? `<description>${xmlEscape(post.excerpt)}</description>` : '',
          pubDate ? `<pubDate>${xmlEscape(pubDate)}</pubDate>` : '',
          '</item>',
        ]
          .filter(Boolean)
          .join(''),
      ]
    })
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${xmlEscape(`${siteTitle} — News`)}</title>`,
    `<link>${xmlEscape(channelURL)}</link>`,
    `<description>${xmlEscape(description)}</description>`,
    `<language>${xmlEscape(language)}</language>`,
    `<atom:link href="${xmlEscape(feedURL)}" rel="self" type="application/rss+xml" />`,
    ...items,
    '</channel>',
    '</rss>',
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
