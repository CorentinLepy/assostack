# CRM notes

CRM notes are staff-only internal context attached to the canonical CRM `Contact` record. They complement structured `interactions`: use interactions for calls, emails, meetings and other timeline events, and use notes for durable internal context that does not need a communication/event taxonomy.

## Data model

Each note belongs to exactly one organization and exactly one Contact in that same organization. A note contains a required plain-text body, an optional short subject, an optional pinned flag, an optional `occurredAt` timestamp for historical context, immutable `createdBy` attribution, and Payload-managed creation/update timestamps.

The Contact remains the source of truth for person or organization identity. Notes do not duplicate membership, partnership, event or other domain state.

## Access model

Organization admins and editors can read, create and update notes in organizations they manage. Only organization admins can delete notes. Ordinary members do not receive broad access to this staff-side collection.

Payload multi-tenancy scopes collection access, while a server-side hook independently validates that the related Contact belongs to the note organization. This protects against crafted relationship IDs that bypass admin UI filtering.

`createdBy` is managed by AssoStack on creation and remains immutable on later updates.

## Non-goals

The first notes boundary deliberately excludes attachments, document management, comments or mentions, public notes, AI summaries, custom fields and bulk import/export. Those concerns should layer on top of a stable CRM source of truth rather than expanding the core note record prematurely.
