# CRM tasks and reminders

AssoStack separates **history** from **follow-up**:

- an Interaction records something that happened;
- a Task records something staff still need to do.

Tasks are tenant-scoped CRM records. They can optionally reference Contacts, the Interaction that created the follow-up, and a staff assignee, but they do not replace membership, event, volunteer or project-specific workflow records.

## Task lifecycle

The initial statuses are:

- `open`
- `in-progress`
- `completed`
- `cancelled`

Priorities are:

- `low`
- `normal`
- `high`
- `urgent`

A Task has a required title and may also contain staff-only rich-text details, a due date, reminder metadata, related Contacts, a related Interaction, an assignee and an external/import reference.

When a Task moves to `completed`, AssoStack manages `completedAt` and `completedBy`. Updating an already completed Task preserves the original completion timestamp and staff attribution. Reopening or cancelling a completed Task clears those completion fields. `createdBy` is managed by the authenticated request and remains immutable.

## Reminder metadata

`remindAt` is an optional date/time indicating when a future notification or automation adapter should surface the Task.

The CRM core does **not** send email, push notifications or calendar reminders itself. It stores provider-neutral reminder intent so later adapters can consume it without changing the Task schema.

When both `remindAt` and `dueAt` are set, the reminder must occur at or before the due date. This rule is enforced server-side, including partial updates where only one of the two timestamps changes.

## Contact and Interaction relationships

Tasks may be standalone, linked to one or more Contacts, linked to a source/context Interaction, or both.

Every supplied Contact ID is validated server-side against the Task organization. A related Interaction is validated the same way. UI filtering is not considered a security boundary: a crafted request containing a Contact or Interaction from another tenant is rejected.

This allows a common workflow such as “meeting happened” -> Interaction -> “send sponsorship proposal next Tuesday” -> Task while keeping history and future work as separate records.

## Staff assignment

An assignee is optional. When supplied, the user must either:

- have an `organization-admin` or current staff `editor` role in the Task organization; or
- be a platform administrator.

An ordinary organization member is not considered CRM staff merely because they belong to the same tenant.

This authorization rule is validated on every write so an assignee cannot be moved across tenants by manually editing API payloads.

## Access and privacy

CRM Tasks are staff data:

- platform administrators can operate across tenants;
- organization administrators and current staff `editor` users can read/write Tasks in organizations where they have that role;
- deletion is restricted to organization administrators;
- ordinary `member` users cannot read the Task collection.

Tasks are intentionally not configured with unlimited Payload version history. Their lifecycle fields provide the current operational state while Interactions and later audit/privacy records capture deliberate history.

## Future integrations

This generic model can later support:

- reminder notifications;
- calendar synchronization;
- automation rules;
- tasks created from incoming emails or forms;
- task dashboards and overdue views;
- association-specific modules that reference or create CRM follow-ups.

Recurring rules, escalation/SLA logic and provider-specific notification delivery remain outside the CRM task core.
