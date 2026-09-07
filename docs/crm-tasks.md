# CRM tasks and reminders

AssoStack separates **history** from **follow-up**:

- an Interaction records something that happened;
- a Task records something staff still need to do.

Tasks are tenant-scoped CRM records. They can optionally reference Contacts and a staff assignee, but they do not replace membership, event, volunteer or project-specific workflow records.

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

A Task has a required title and may also contain staff-only rich-text details, a due date, related Contacts, an assignee and an external/import reference.

When a Task moves to `completed`, AssoStack manages `completedAt` and `completedBy`. Reopening or cancelling a completed Task clears those completion fields. `createdBy` is also managed by the authenticated request and cannot be rewritten by clients.

## Contact relationships

Tasks may be standalone or linked to one or more Contacts.

Every supplied Contact ID is validated server-side against the Task organization. UI filtering is not considered a security boundary: a crafted request containing a Contact from another tenant is rejected.

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

Recurring rules and provider-specific notification logic remain outside the CRM task core.
