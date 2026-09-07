import type { APIRoute } from 'astro'

import {
  getPublicOrganization,
  isPublicContentConfigured,
} from '../lib/public-content'
import { getCanonicalURL } from '../lib/seo'

export const prerender = true

export const GET: APIRoute = async () => {
  const lines = ['User-agent: *', 'Allow: /']

  if (isPublicContentConfigured()) {
    const organization = await getPublicOrganization()
    const sitemapURL = getCanonicalURL(organization, '/sitemap.xml')
    if (sitemapURL) {
      lines.push('', `Sitemap: ${sitemapURL}`)
    }
  }

  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
