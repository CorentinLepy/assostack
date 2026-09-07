# Volunteer shifts and assignments

AssoStack models volunteering without creating a second identity system.

A volunteer is still a CRM `Contact`. Volunteer-specific operational data lives in shifts and assignments attached to Events. This keeps one canonical person or organization record even when the same Contact is also a member, participant, sponsor contact or donor.

## Volunteer Shifts

A `Volunteer Shift` belongs to one organization and exactly one Event in that organization.

A shift includes:

- a human-readable name;
- a stable machine key unique inside its parent Event;
- an explicit lifecycle (`draft`, `open`, `closed`, `cancelled`, `completed`);
- required start and end timestamps;
- optional positive-integer capacity metadata;
- optional meeting point/location name;
- optional concise instructions;
- optional provider-neutral external/import reference;
- immutable `createdBy` staff attribution.

The end timestamp must be strictly after the start timestamp.

Shift timestamps are intentionally allowed outside the parent Event window. Setup can happen before an Event begins and cleanup can happen after it ends.

Capacity is metadata in this version. AssoStack validates that it is a positive whole number but does not automatically reject assignments or optimize staffing.

## Volunteer Assignments

A `Volunteer Assignment` belongs to one organization and references:

- exactly one Volunteer Shift in that organization;
- exactly one CRM Contact in that organization.

The shift's parent Event is also revalidated against the assignment organization. This adds a second explicit relationship check on top of collection tenant scoping.

Both person and organization Contacts are accepted by the generic core. A later product module can introduce stricter role-specific eligibility without changing the core identity model.

The current assignment lifecycle supports:

- `invited`;
- `confirmed`;
- `cancelled`;
- `completed`;
- `no-show`.

Source metadata is provider-neutral (`manual`, `form`, `import`, `api`, `integration`, `other`). An optional external reference can hold an import/provider identifier but never credentials or secrets.

There is one current assignment record per Shift and Contact. Re-assignment changes the existing record's status instead of creating duplicate assignment identity.

## History and deletion

Assignment status represents current operational state, not an immutable event log. A richer audit/event stream can be introduced later if real usage requires it.

Volunteer Shifts that already have assignment history cannot be deleted through normal collection operations. Staff should cancel or complete them instead. An organization administrator may delete an unreferenced shift as cleanup.

Assignment deletion is restricted to organization administrators and should remain exceptional; normal lifecycle changes use the assignment status.

## Tenant isolation and access

Organization administrators and editors can create, read and update staff-side volunteer shifts and assignments. Destructive deletion is restricted to organization administrators.

Ordinary `member` users do not receive broad staff-side collection access in this version. Public/member volunteer signup will use a separate form or portal boundary later.

Tenant isolation is enforced through both Payload multi-tenancy and explicit server-side relationship checks. Crafted IDs from another organization are rejected even if UI filtering is bypassed.

## Non-goals of the first version

The core intentionally does not yet implement:

- a duplicate volunteer profile or identity table;
- skills and qualification taxonomy;
- recurring availability calendars;
- automatic staffing optimization;
- email/SMS reminders;
- public volunteer signup forms;
- QR or volunteer check-in;
- payroll or expenses;
- Team SMH-specific marshal, race-control or competition-role logic.

Those capabilities can layer on top once Shift + Assignment identity is stable.
