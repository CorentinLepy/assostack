import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(dirname, '..')

const richText = (text) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  },
})

const organization = {
  name: 'Demo Association',
  slug: 'demo-association',
  locale: 'fr-FR',
  timezone: 'Europe/Paris',
  identity: {
    logo: null,
    siteTitle: 'Demo Association Web',
    tagline: 'A configurable AssoStack website.',
  },
  navigation: [
    {
      external: true,
      href: 'https://example.com/partner',
      label: 'Partner',
      newTab: true,
    },
    {
      external: false,
      href: '/about',
      label: 'Discover us',
      newTab: false,
    },
  ],
  publicContact: {
    email: 'contact@demo.test',
    phone: null,
  },
  theme: {
    colors: {
      accent: '#D97706',
      background: '#FFFDF7',
      muted: '#6B6255',
      primary: '#123456',
      surface: '#F6F1E7',
      text: '#171717',
    },
    fontFamily: 'serif',
    radius: 'large',
  },
  website: {
    navigationMode: 'manual',
    primaryDomain: 'demo.test',
  },
}

const pages = [
  {
    publishedAt: '2026-09-06T20:00:00.000Z',
    slug: 'about',
    summary: 'About the demo association.',
    title: 'About us',
    updatedAt: '2026-09-06T20:00:00.000Z',
  },
  {
    publishedAt: '2026-09-06T20:00:00.000Z',
    slug: 'home',
    summary: 'A real organization website rendered through AssoStack.',
    title: 'Welcome to Demo Association',
    updatedAt: '2026-09-06T20:00:00.000Z',
  },
]

const fullPages = {
  about: {
    ...pages[0],
    content: richText('This page was generated from the public content API contract.'),
    meta: {
      description: 'Demo association about page.',
      image: null,
      title: 'About Demo Association',
    },
    sections: [],
  },
  home: {
    ...pages[1],
    content: {},
    meta: {
      description: 'Demo association homepage.',
      image: null,
      title: null,
    },
    sections: [
      {
        type: 'hero',
        alignment: 'left',
        action: {
          external: false,
          href: '/about',
          label: 'Meet the association',
          newTab: false,
        },
        eyebrow: 'Demo Association',
        heading: 'A homepage assembled from reusable sections',
        image: null,
        text: 'Editors can compose a public page without changing Astro code.',
      },
      {
        type: 'richText',
        content: richText('This structured rich-text section came through the public API.'),
      },
      {
        type: 'cards',
        heading: 'What we do',
        intro: 'Reusable cards remain generic across organizations.',
        items: [
          {
            action: null,
            image: null,
            text: 'A first reusable information card.',
            title: 'Community',
          },
          {
            action: {
              external: true,
              href: 'https://example.com/events',
              label: 'See events',
              newTab: true,
            },
            image: null,
            text: 'A card can expose a safe external action.',
            title: 'Events',
          },
        ],
      },
      {
        type: 'callout',
        action: {
          external: false,
          href: '/about',
          label: 'Learn more',
          newTab: false,
        },
        heading: 'Ready to participate?',
        text: 'The callout is another constrained reusable section.',
        tone: 'accent',
      },
    ],
  },
}

const json = (response, body, status = 200) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(body))
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  const prefix = '/api/public/v1/demo-association'

  if (url.pathname === `${prefix}/site`) {
    return json(response, { apiVersion: 'v1', data: organization })
  }

  if (url.pathname === `${prefix}/pages`) {
    return json(response, {
      apiVersion: 'v1',
      data: pages,
      pagination: {
        hasNextPage: false,
        limit: 50,
        page: 1,
        totalDocs: pages.length,
        totalPages: 1,
      },
    })
  }

  const pageMatch = url.pathname.match(
    /^\/api\/public\/v1\/demo-association\/pages\/([^/]+)$/,
  )
  if (pageMatch) {
    const page = fullPages[decodeURIComponent(pageMatch[1])]
    if (page) {
      return json(response, { apiVersion: 'v1', data: page })
    }
  }

  return json(
    response,
    {
      apiVersion: 'v1',
      error: {
        code: 'not_found',
        message: 'Resource not found',
      },
    },
    404,
  )
})

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

try {
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Could not resolve mock public API port.')
  }

  const child = spawn('pnpm', ['build'], {
    cwd: webRoot,
    env: {
      ...process.env,
      ASSOSTACK_API_URL: `http://127.0.0.1:${address.port}`,
      ASSOSTACK_ORGANIZATION: 'demo-association',
    },
    stdio: 'inherit',
  })

  const exitCode = await new Promise((resolve) => child.once('exit', resolve))
  if (exitCode !== 0) {
    throw new Error(`Configured Astro build failed with exit code ${String(exitCode)}.`)
  }

  const homeHTML = await readFile(path.join(webRoot, 'dist', 'index.html'), 'utf8')
  const aboutHTML = await readFile(path.join(webRoot, 'dist', 'about', 'index.html'), 'utf8')

  if (!homeHTML.includes('A homepage assembled from reusable sections')) {
    throw new Error('Configured build did not render the structured home hero.')
  }

  if (!homeHTML.includes('This structured rich-text section came through the public API.')) {
    throw new Error('Configured build did not render a structured rich-text section.')
  }

  if (!homeHTML.includes('Community') || !homeHTML.includes('Ready to participate?')) {
    throw new Error('Configured build did not render cards and callout sections.')
  }

  if (!aboutHTML.includes('About us')) {
    throw new Error('Configured build did not generate the published /about page.')
  }

  if (!aboutHTML.includes('This page was generated from the public content API contract.')) {
    throw new Error('Configured build did not preserve rich-text-only page fallback rendering.')
  }

  if (!homeHTML.includes('Demo Association Web')) {
    throw new Error('Configured build did not render the public site title.')
  }

  const partnerPosition = homeHTML.indexOf('Partner')
  const discoverPosition = homeHTML.indexOf('Discover us')
  if (partnerPosition === -1 || discoverPosition === -1 || partnerPosition > discoverPosition) {
    throw new Error('Configured build did not preserve manual navigation order.')
  }

  if (!homeHTML.includes('https://example.com/partner')) {
    throw new Error('Configured build did not render the external navigation target.')
  }

  if (!homeHTML.includes('target="_blank"') || !homeHTML.includes('noopener noreferrer')) {
    throw new Error('Configured build did not protect new-tab external links.')
  }

  if (!homeHTML.includes('--as-color-primary:#123456')) {
    throw new Error('Configured build did not apply public theme color tokens.')
  }

  if (!homeHTML.includes('--as-radius:1.25rem')) {
    throw new Error('Configured build did not apply the public radius token.')
  }

  console.log('Configured organization build rendered page sections, fallback content and site settings successfully.')
} finally {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
}
