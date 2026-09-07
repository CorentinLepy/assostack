# CRM interactions and notes

AssoStack records staff CRM history in the tenant-scoped `interactions` collection.

An Interaction is a dated timeline entry linked to one or more Contacts. It does not change the Contact's identity and it is not an association membership, event registration, volunteer assignment or task.

## Interaction kinds

The initial reusable kinds are:

- `note`
- `email`
- `phone-call`
- `meeting`
- `other`

Communication-oriented entries can optionally use `internal`, `inbound` or `outbound` direction. Integrations may later translate provider-specific events into these generic kinds rather than adding Brevo/Microsoft-specific fields to the core model.

Each Interaction has:

- the organization/tenant;
- one or more related Contacts;
- the date/time the interaction actually occurred;
- a subject;
- optional rich-text details;
- the staff user who created the record;
- an optional external/import reference.

## Relationship isolation

An Interaction may reference several Contacts, for example a meeting with both a person and their partner organization.

Every related Contact is validated server-side against the Interaction's tenant. Supplying a Contact ID from another tenant, including alongside valid same-tenant IDs, rejects the write.

This validation is independent of UI filtering. A crafted API request therefore cannot create cross-tenant CRM relationships.

## Access and privacy

Interactions are staff CRM data:

- platform administrators can operate across tenants;
- organization administrators and current staff `editor` users can read and write interactions for their organizations;
- deletion is restricted to organization administrators;
- ordinary members cannot read the interaction collection.

`createdBy` is managed from the authenticated request and is not a client-controlled attribution field.

Interactions are intentionally not configured with unlimited Payload document version history. Historical CRM facts belong in explicit timeline records; retaining every edited snapshot of staff notes and personal data indefinitely would create unnecessary privacy and retention burden.

## Future capabilities

Later CRM work can build on this boundary with:

- tasks/reminders;
- contact tags and segments;
- consent/privacy records;
- import pipelines;
- email/calendar adapters that create Interaction records;
- audit/retention rules.

Association-specific workflows such as memberships and volunteering will reference Contacts but remain separate domain collections/modules.
