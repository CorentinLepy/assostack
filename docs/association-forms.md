# Forms and submissions

AssoStack forms are a tenant-scoped association building block. The core owns reusable form schemas and immutable response payloads; rendering, anti-spam, payment and provider-specific delivery remain adapter concerns.

## Form schema

A `forms` record belongs to one organization and has a tenant-local stable `key`, title, lifecycle status and an ordered field schema. Supported first-version field types are short text, long text, email, number, boolean, date, single select and multi select.

Field keys are normalized and must be unique within one form. Select option values must also be unique within their field. Only forms in `active` status accept new submissions.

Once a form has submission history, its field schema cannot be changed and the form cannot be deleted. Archive the old form and create a new form/version instead. This deliberately favors historical correctness over in-place schema mutation.

## Submissions

A `form-submissions` record belongs to the same organization as its Form. It can optionally reference one canonical CRM Contact from that organization.

On creation, submitted values are validated against the current Form schema. Each stored value snapshots the field key, label and type plus exactly one typed value. Required fields, email syntax, finite numbers, dates and select options are validated server-side.

After creation, the response payload, Form, Contact, source, creator and `submittedAt` are immutable. Staff can only move the review lifecycle through `received`, `reviewing`, `accepted`, `rejected` and `archived`.

## Access

Organization admins and editors can read and manage forms/submissions in organizations where they hold those roles. Form and submission deletion is admin-only. Ordinary members do not receive broad staff access. Every Form/Contact relationship is revalidated server-side against the submission organization.

## Extension boundary

This module intentionally does not expose anonymous/public submission endpoints yet. A future public-form adapter can reuse the same domain model while adding Turnstile/CAPTCHA, rate limits, consent capture, email notifications or payment workflows without weakening the core tenant rules.

File uploads, conditional logic, signatures, payments and workflow automation are also outside this first foundation.
