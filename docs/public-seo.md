# Public SEO and discovery

AssoStack organization websites are generated as static Astro output. Public discovery metadata is therefore produced at build time from the same tenant-scoped public API used to render Pages and Posts.

## Canonical origin

`organization.settings.website.primaryDomain` is the source of truth for the public canonical origin.

Both hostnames and absolute HTTP(S) origins are accepted by the web renderer:

```text
demo.example.org
https://demo.example.org
```

A hostname is normalized to HTTPS. When no valid primary domain is configured, the site still builds and renders, but absolute canonical/discovery URLs are intentionally omitted where they cannot be produced safely.

The backend/content API origin is never used as a canonical public origin.

## Page metadata

Configured organization pages emit:

- `<title>` and description metadata;
- canonical URLs;
- Open Graph title, description, URL, locale, site name and optional image;
- Twitter card metadata;
- article publication/modification timestamps for news Posts.

Existing Payload SEO fields are used first, with the existing public title/summary/excerpt values as fallbacks.

## robots.txt

`/robots.txt` allows public crawling. When a canonical public origin is available, it also advertises the canonical `/sitemap.xml` URL.

It never references the Payload backend or public-content API.

## sitemap.xml

`/sitemap.xml` contains only records returned by the public content API, which itself exposes published content only.

The sitemap includes:

- the home page;
- published non-home Pages;
- the `/news` index;
- published Posts under `/news/{slug}`.

`updatedAt` is emitted as `lastmod` where available. Listing calls follow API pagination so sites with more than one public-content page are not silently truncated.

When no canonical origin is configured, a valid empty sitemap is produced instead of inventing a hostname.

## RSS

`/news/rss.xml` is an RSS 2.0 feed for public Posts. Items use canonical public article URLs when a primary domain is configured and include publication dates and excerpts when available.

The feed never embeds internal Payload IDs or backend API URLs.

## Security boundary

SEO/discovery files must remain downstream of the public v1 API rather than querying Payload collections directly. This preserves the same tenant and publication boundary used by the rest of the public site and prevents drafts or cross-tenant content from entering static artifacts.
