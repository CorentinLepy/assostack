# Public page sections

AssoStack pages support a deliberately constrained section system for organization-managed public websites.

The goal is to let non-developers compose useful pages without turning the CMS into a free-form HTML/CSS/JavaScript editor.

## Rendering model

A page can use either:

1. **structured sections** — rendered in their configured order; or
2. **simple rich text** — used as the backwards-compatible fallback when no sections exist.

Structured sections take precedence on the public Astro website when at least one section is configured.

## Initial section types

### Hero

A prominent heading with optional eyebrow text, supporting copy, organization-owned image, alignment, and one action.

### Rich text

A section containing Payload/Lexical rich-text content rendered through AssoStack's safe public rich-text renderer.

### Callout

A compact highlighted section with a heading, optional text, neutral/accent presentation, and one action.

### Cards

An optional section heading/introduction followed by one to six reusable information cards. Cards can contain an organization-owned image, title, text, and one action.

## Actions

Actions are either:

- an internal relationship to a page owned by the same organization; or
- an absolute `http://` or `https://` URL.

The public API converts actions to a small ID-free DTO containing only the final `href`, label, external flag, and new-tab flag. Internal targets that are not published are omitted from the public response.

New-tab links are rendered with `noopener noreferrer` by Astro.

## Tenant isolation

Page and media relationships inside sections are validated at write time. A page belonging to organization A cannot reference a page or media record belonging to organization B.

The public serializer repeats the ownership check before exposing populated media or internal page actions. UI filtering alone must never be considered a security boundary.

## Styling

Sections consume the organization's constrained theme tokens (colors, font family, radius). Arbitrary CSS and JavaScript are intentionally unsupported.

This keeps public content portable across AssoStack themes and prevents CMS content from becoming an execution surface.

## Extension rules

New section types should be added only when they represent a reusable organization use case. Team SMH-specific presentation must not be added to the generic section set.

A new section requires:

- a Payload block definition;
- tenant-safe relationship validation where applicable;
- a stable public DTO;
- explicit public serialization;
- an Astro renderer;
- responsive/accessibility review;
- backend integration tests;
- configured Astro build coverage;
- a versioned PostgreSQL migration when the schema changes.

The project intentionally does not provide a free-form drag-and-drop canvas in the 0.2 CMS milestone.
