# Memberships

AssoStack memberships are a reusable association-operations module built on the CRM Contact identity boundary.

## Domain boundary

A Membership never duplicates a person's or organization's identity. It references an existing tenant-scoped Contact and a tenant-scoped Membership Type.

Membership Types describe organization-local categories such as a standard, supporting or corporate membership. Their keys are normalized and unique only inside one organization.

Membership records capture membership history with a status, start/end dates and optional tenant-local membership number. Both person and organization Contacts are supported.

## Lifecycle

Membership Types can be active or archived. Archiving preserves historical references and is preferred over deleting a type already used by memberships.

Membership status is explicit: `pending`, `active`, `suspended`, `ended` or `cancelled`. Dates do not automatically change status; automation can be layered later without changing the core history model.

## Tenant and access rules

Membership Types and Memberships are tenant-scoped. Server-side hooks reject Contact and Membership Type relationships that belong to another organization, including crafted IDs submitted outside the admin UI.

Organization admins and editors can manage memberships in this first version. Ordinary members do not receive CRM/association staff access. Member self-service is a later concern.

Membership Type keys and non-empty membership numbers are unique per organization. Database constraints mirror these application-level rules to protect concurrent writes.

## Attribution and privacy

Membership creation records immutable staff `createdBy` attribution. Membership notes are intentionally concise; identity and general relationship history belong in Contacts and Interactions rather than being copied into Memberships.

## Deliberate non-goals

This module does not implement payments, invoices, HelloAsso synchronization, automatic renewals, subscription billing, membership cards, voting rights, automatic status transitions or a member portal. Those capabilities should integrate with this stable provider-neutral membership history rather than redefine it.
