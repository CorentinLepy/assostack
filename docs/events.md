# Events and registrations

AssoStack models association events as a reusable domain layer on top of tenant-scoped CRM Contacts.

The boundary is deliberately provider-neutral: an Event is the association's source of truth, and an Event Registration links an existing Contact to that Event. Payment providers, public forms, QR check-in and sport-specific competition data can integrate later without owning the core identity model.

## Events

An `Event` belongs to one organization and includes:

- a human-readable title;
- a stable tenant-local machine key;
- an explicit lifecycle (`draft`, `scheduled`, `cancelled`, `completed`);
- a required start timestamp and optional end timestamp;
- an IANA timezone;
- optional positive-integer capacity metadata;
- optional provider-neutral physical location metadata;
- optional concise description;
- optional external/import reference;
- immutable `createdBy` staff attribution.

The event key is normalized and unique only inside one organization. Different organizations may independently use the same key.

If no timezone is supplied, AssoStack copies the organization's configured timezone. `UTC` is only the final generic fallback when organization configuration cannot provide one. Invalid IANA timezones are rejected.

An end timestamp cannot precede the start timestamp. Dates do not automatically change lifecycle state.

Capacity is metadata in this first version. AssoStack validates that it is a positive whole number but does not automatically reject or waitlist registrations when capacity is reached.

## Event Registrations

An `Event Registration` belongs to one organization and references:

- exactly one Event in that organization;
- exactly one CRM Contact in that organization.

Both person and organization Contacts are valid registrants.

The current registration lifecycle supports:

- `pending`;
- `confirmed`;
- `waitlisted`;
- `cancelled`;
- `attended`;
- `no-show`.

Source metadata is provider-neutral (`manual`, `form`, `import`, `api`, `integration`, `other`). An optional external reference can hold a provider/import identifier but never credentials or secrets.

There is one current registration record per Event and Contact. Cancellation or re-registration changes the existing record's status rather than creating duplicate registration identity. The database migration enforces this rule with a tenant-scoped composite unique index.

## History and deletion

Registration status is current operational state, not a full immutable event log. A richer audit/event stream can be introduced later if product requirements justify it.

Events that already have registration history cannot be deleted through normal collection operations. Staff should cancel or complete them instead. An organization administrator may delete an Event only while it has no registrations.

Registration deletion is restricted to organization administrators and should be exceptional cleanup; normal lifecycle changes should use the registration status.

## Tenant isolation and access

Organization administrators and editors can create, read and update staff-side Events and Event Registrations. Destructive deletion is restricted to organization administrators.

Ordinary `member` users do not receive broad staff-side collection access in the first version. Member-facing registration flows will use a separate public/portal API boundary later.

Tenant isolation is enforced twice:

1. Payload's multi-tenant plugin scopes collection access;
2. server-side hooks explicitly verify that Event and Contact relationships belong to the same organization as the registration.

A crafted API request using a valid ID from another tenant is rejected even if UI filtering is bypassed.

## Non-goals of the first version

The core intentionally does not yet implement:

- payments or ticket settlement;
- HelloAsso synchronization;
- QR check-in;
- volunteer shifts;
- seating plans;
- recurring-event rule engines;
- automatic capacity or waitlist promotion;
- public Astro event pages and forms;
- Team SMH competition, results or ranking logic.

Those capabilities can layer on top once the generic Event + Registration source of truth is stable.
