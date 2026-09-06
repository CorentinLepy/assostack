# Organization website configuration

AssoStack keeps public-site identity and presentation choices on the organization record while keeping the site implementation generic.

The goal is to let one AssoStack installation serve very different organizations without forking the Astro application or allowing arbitrary executable customization.

## Identity

An organization can configure:

- a public site title (falling back to the organization name);
- a short tagline;
- an optional logo stored in the organization's media library;
- a primary public domain;
- public contact email and phone values.

Logo relationships are validated at write time. An organization cannot select media owned by another tenant.

## Navigation

Two modes are available.

### Automatic

The Astro site derives its primary navigation from published pages. The reserved `home` page is omitted from the generated menu because the site brand already links to `/`.

Automatic mode is the default and requires no navigation configuration.

### Manual

Organization administrators may define an ordered list containing:

- internal published pages owned by the same organization;
- absolute external URLs using only `http://` or `https://`.

External entries may opt into a new browser tab. The Astro renderer adds `noopener noreferrer` when doing so.

Manual navigation never exposes Payload relationship IDs. The public API serializes an explicit contract containing only `label`, `href`, `external`, and `newTab`.

A manual menu may intentionally be empty; AssoStack does not silently switch back to automatic navigation in that case.

## Theme tokens

AssoStack deliberately exposes a constrained design-token model instead of arbitrary CSS or JavaScript.

Supported color tokens are six-digit hexadecimal values:

- primary;
- accent;
- background;
- surface;
- text;
- muted.

Supported font-family presets are:

- `system`;
- `humanist`;
- `serif`;
- `mono`.

Supported radius presets are:

- `none`;
- `small`;
- `medium`;
- `large`.

The public API applies stable defaults when a token is absent. Astro validates the public token values again and maps them to CSS custom properties.

This double validation means a public-site build does not trust arbitrary style values even if the API is replaced or proxied by another implementation.

## Default theme

The current neutral defaults are:

```text
primary:    #161616
accent:     #2563EB
background: #FBFBF9
surface:    #F7F7F5
text:       #161616
muted:      #6B7280
fontFamily: system
radius:     medium
```

These are implementation defaults, not Team SMH branding.

## Tenant isolation

Organization website settings are nested on the tenant record itself. Payload's multi-tenant plugin therefore cannot automatically validate every nested page/media relationship.

AssoStack adds a server-side `beforeChange` validation hook to enforce tenant ownership for:

- the public logo;
- internal navigation pages.

The public serializer performs a second ownership check before emitting a relationship into the public contract. This is defense in depth; write-time validation remains the primary invariant.

## Public contract

The public `site` response exposes only the data needed by the frontend:

```text
identity
navigation
publicContact
theme
website.navigationMode
website.primaryDomain
locale
timezone
```

Database IDs, role assignments and other Payload internals remain outside the public DTO.

## Deliberate non-features

The initial configuration model does **not** support:

- arbitrary CSS;
- arbitrary JavaScript;
- raw HTML snippets;
- a drag-and-drop layout builder;
- cross-tenant media/page references;
- custom font file uploads as a core feature.

Those constraints keep the first public-site system portable, secure, cacheable and easy to reason about. More expressive theming can be added later through versioned theme components rather than unbounded code injection.
