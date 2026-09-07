# CRM contact model

AssoStack uses a single tenant-scoped `contacts` collection as the reusable identity boundary for CRM and association modules.

A Contact is **not** a membership, volunteer assignment, sponsor relationship, donation, event registration, or user account. Those concepts reference Contacts instead of creating their own copies of people and organizations.

This allows one real person to be, for example, an association member, an event volunteer and the contact person for a partner without duplicating their identity or contact details.

## Contact kinds

A Contact has one of two generic kinds:

- `person`
- `organization`

The model deliberately uses `organization` rather than association/company-specific terminology so it can represent clubs, companies, public bodies, suppliers, sponsors, federations and other legal or informal organizations.

`displayName` is the stable human-readable CRM label used in lists and relationships. If it is omitted when creating structured data, AssoStack can derive it from person first/last name or organization name/legal name.

Structured identity fields are optional. This matters for imports and legacy data where only a display label may be known reliably.

## Contact details

The initial core stores:

- primary email;
- primary phone;
- jurisdiction-neutral postal address;
- optional external/import reference.

Country is stored as an ISO 3166-1 alpha-2 code. Address fields do not assume a French-only postal structure.

The external reference is indexed for migration/import lookup but intentionally not globally unique. Different tenants and source systems may reuse the same identifiers.

Multiple communication channels, source-specific IDs and deduplication rules can be added later without changing the Contact identity boundary.

## Lifecycle

Contacts use `active` or `archived` status. Archiving records `archivedAt`; restoring the Contact clears that timestamp.

Archiving is preferred to deleting a Contact that may later be referenced by memberships, interactions, events or accounting/export history. Hard deletion remains restricted to organization administrators and should become increasingly exceptional as relationship collections are introduced.

## Privacy and access

Contacts may contain personal data. At the CRM 0.3 foundation stage:

- platform administrators can access all tenants;
- organization administrators and staff `editor` users can access Contacts for organizations where they hold that role;
- ordinary `member` users cannot read the CRM contact collection;
- cross-tenant reads and writes are blocked by server-side access control and tenant isolation.

The current `editor` role is a temporary broad staff role inherited from the foundation milestone. More granular CRM/event/content permissions can be introduced as the module authorization model matures; the security invariant is that ordinary members never gain bulk CRM PII access merely because they belong to the same organization.

## Versioning and retention

Contacts are intentionally **not** configured with Payload document version history. Permanently retaining every historical copy of personal data would create an unnecessary privacy and retention burden.

Relationship/audit requirements should be represented through deliberate interaction, consent, audit and lifecycle records rather than unlimited snapshots of personal data.

Detailed privacy/consent metadata, retention automation and data-subject workflows are separate CRM 0.3 work.

## Future references

Planned collections/modules will reference `contacts` rather than introducing parallel person tables, including:

- memberships;
- event participation;
- volunteer assignments;
- sponsor/partner relationships;
- donations;
- interactions and notes;
- tasks;
- Team SMH sport-domain records such as pilots/drivers where appropriate.
