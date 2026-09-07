# CRM custom fields

AssoStack custom fields extend CRM Contacts without adding Team SMH-specific columns to the core Contact schema.

## Model

`custom-field-definitions` stores tenant-scoped field metadata. Each definition has a stable tenant-local key, label, type, optional help text, ordering metadata, required metadata, lifecycle status and optional select choices.

`contact-custom-field-values` stores one typed value for one `(Contact, field)` pair. Contact identity remains canonical in `contacts`; custom values never duplicate person or organization identity.

Supported first-version types are short text, long text, number, boolean, date, single select and multi select. Values use explicit storage fields rather than arbitrary executable schemas or user-provided code.

## Safety

Organization admins manage field definitions. Organization admins and editors manage Contact values. Ordinary members receive no broad admin access.

Server-side hooks validate that Contact, field definition and value all belong to the same organization. Select values must be configured options, and a Contact can only hold one value for the same field. Database migrations add matching tenant-local definition-key and Contact/field uniqueness constraints.

Definitions should be archived rather than repurposed when historical values exist. A definition type becomes immutable once values exist.

## Boundary

This foundation is Contact-only. It does not yet provide custom fields for memberships, events, partnerships or other modules, formulas, conditional schemas, public form rendering, import/export UI or automation. Those capabilities can layer on this model later without changing Contact identity semantics.
