# CRM privacy purposes and history

AssoStack treats privacy/consent state as explicit operational history instead of embedding provider-specific booleans in `Contact`.

This is an application data model, not legal advice. Organizations remain responsible for defining appropriate purposes, legal bases, retention policies and operational procedures for the jurisdictions in which they operate.

## Privacy Purposes

A `Privacy Purpose` is a tenant-scoped definition of why personal data is processed.

Examples could include:

- membership administration;
- event registration;
- newsletter communication;
- volunteer coordination.

Each purpose has:

- a human-readable name;
- a stable tenant-local `key`;
- legal-basis metadata;
- an active/archive lifecycle;
- an optional internal description.

The key is normalized and unique only inside one organization. Different organizations may independently use the same key.

Archiving is preferred over deleting a purpose that historical Privacy Records reference.

## Privacy Records

A `Privacy Record` is an append-oriented event linked to exactly one Contact and one Privacy Purpose in the same organization.

Supported event types are:

- `granted`;
- `withdrawn`;
- `denied`;
- `basis-recorded`.

Supported source metadata is deliberately provider-neutral:

- `manual`;
- `form`;
- `import`;
- `api`;
- `integration`;
- `other`.

A record also stores an effective timestamp, optional expiry, optional external/evidence reference, optional concise staff note and immutable `createdBy` attribution.

Normal CRM users cannot update Privacy Records. A correction must be represented by a new event so that decision history remains auditable. Organization administrators may delete records only for exceptional privacy/erasure operations; this is not intended as the normal editing path.

## Tenant isolation

Both Contact and Privacy Purpose relationships are validated server-side on write. Supplying a valid database ID from another tenant is rejected even when a crafted API request bypasses UI filtering.

Ordinary `member` users cannot read the privacy taxonomy or privacy history. Access is restricted to organization staff roles and platform administrators according to the existing AssoStack access-control model.

## What this model intentionally does not do

The core does not automatically decide whether a legal basis is appropriate. It also does not yet provide:

- Brevo/newsletter synchronization;
- automatic retention/deletion;
- DSAR workflows;
- proof-document storage;
- channel-specific consent booleans;
- provider payload archives;
- an automatic calculation of a Contact's effective marketing eligibility.

Those capabilities can be layered later on top of the stable purpose/history model without changing Contact identity or losing historical evidence.

## Future integrations

Forms, imports and providers should append Privacy Records through the normal server-side API rather than mutating a boolean on Contact.

A future projection/service may derive the current effective state for `(organization, contact, purpose)` by ordering applicable records by `effectiveAt` and applying expiry rules. That projection should remain derived data; the append-oriented records are the source history.
