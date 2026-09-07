# CRM memberships

AssoStack models association membership as a reusable domain layer on top of the CRM Contact identity boundary.

A membership never owns a duplicate person or organization identity. It references an existing `Contact`, so the same CRM party can later also be a volunteer, sponsor contact, donor, participant or any other domain role without copying contact data.

## Membership Types

A `Membership Type` is tenant-scoped taxonomy such as Individual, Family, Student or Partner.

Each type has:

- a human-readable name;
- a stable tenant-local `key`;
- an active/archive lifecycle;
- an optional concise internal description.

The key is normalized and unique only inside one organization. Different organizations may independently use the same key.

Archiving is preferred over deleting a type referenced by historical membership records.

## Memberships

A `Membership` belongs to one organization and references:

- exactly one Contact in that organization;
- exactly one Membership Type in that organization.

Both person and organization Contacts are valid membership holders. This keeps the core neutral enough for individual, family, corporate, partner or federation-style membership models.

The first lifecycle supports:

- `pending`;
- `active`;
- `suspended`;
- `ended`;
- `cancelled`.

Each membership also stores a required start date, optional end date, optional tenant-local membership number, optional external/import reference, optional concise staff note and immutable `createdBy` attribution.

An end date cannot precede the start date. Dates do not automatically change lifecycle status in this version; status remains an explicit staff decision.

## Membership numbers

`membershipNumber` is optional. Leading and trailing whitespace is removed before storage.

When present, it is unique inside one organization. The same number may exist in different organizations, and multiple memberships without a number are allowed.

This identifier is deliberately not coupled to any payment or membership provider.

## Tenant isolation and access

Contact and Membership Type relationships are validated server-side on every write. Supplying a valid database ID from another tenant is rejected even when a crafted API request bypasses UI filtering.

Organization administrators and editors can create, read and update memberships and membership types. Destructive deletion is restricted to organization administrators. Ordinary `member` users cannot read or manage this staff-side membership data in the first version.

Member self-service will be introduced behind a separate portal/API boundary rather than broadening admin collection access.

## Non-goals of the first version

The core intentionally does not yet implement:

- payments or invoices;
- HelloAsso synchronization;
- automatic renewals;
- subscription billing;
- automatic status changes based on dates;
- member self-service;
- voting rights or governance rules;
- membership cards;
- an enforced single active membership per Contact/Type.

Those capabilities can be layered later without changing Contact identity or the basic membership lifecycle model.
