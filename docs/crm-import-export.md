# CRM Contact CSV import/export

AssoStack exposes a provider-neutral CSV foundation for moving tenant-scoped CRM Contact data in and out of the platform.

## Access boundary

Only platform administrators and users with the `organization-admin` or `editor` role for the target organization may import or export Contacts. The organization is selected by the authenticated endpoint path and is never read from CSV rows, so crafted input cannot redirect a row into another tenant.

Ordinary `member` users have no broad import/export access.

## Endpoints

- `GET /api/crm/v1/organizations/:organization/contacts.csv`
- `POST /api/crm/v1/organizations/:organization/contacts/import`

The import request body is JSON:

```json
{
  "csv": "kind,displayName,email\r\nperson,Jane Doe,jane@example.org\r\n",
  "dryRun": true
}
```

`dryRun` defaults to `true`. A dry run performs parsing, header validation, row validation, custom-field validation and access checks without writing Contacts.

## Core columns

The export order is stable:

`kind,status,displayName,firstName,lastName,organizationName,organizationLegalName,registrationNumber,website,email,phone,addressLine1,addressLine2,postalCode,city,region,countryCode,externalReference`

Imports may provide any subset of these columns. `kind` defaults to `person` and `status` defaults to `active`.

Person rows need at least `displayName`, `firstName` or `lastName`. Organization rows need at least `displayName`, `organizationName` or `organizationLegalName`.

Country codes use ISO 3166-1 alpha-2 syntax and are normalized to uppercase.

## Custom fields

Custom fields use their tenant-local stable key as a CSV header:

```text
custom:preferred-channel
custom:interests
```

Unknown keys and archived definitions are rejected on import. Required active definitions must contain a value in every imported row.

Value encoding is deliberately small and deterministic:

- short text / long text: cell text;
- number: finite decimal number;
- boolean: `true`, `false`, `1`, `0`, `yes` or `no`;
- date: `YYYY-MM-DD`;
- single select: exact configured option value;
- multi select: JSON string array, for example `["events","news"]` inside the CSV cell.

The normal CSV quoting rules still apply, so a multi-select cell is commonly serialized as `"[""events"",""news""]"`.

## Import semantics

The first version is intentionally create-only. It does not guess whether a row matches an existing Contact, perform fuzzy deduplication, update existing Contacts or delete data.

All rows are validated before any write begins. If any input row is invalid, no rows are imported. During the write phase, every creation still goes through the normal Payload collection access rules and hooks. If an unexpected error occurs after a Contact has been created for one row, the importer performs compensating cleanup for that row.

Errors include the CSV row number and, when relevant, the offending column.

## Export semantics

Exports contain Contacts, custom-field definitions and custom values from one organization only. Custom columns are sorted by custom-field `sortOrder` and then stable key. Both active and archived definitions may appear in export so historical values remain representable.

## Extension boundary

This foundation intentionally does not include XLSX, UI mapping wizards, background large-file jobs, scheduled exports, automatic deduplication, destructive bulk updates or external-provider mappings. Future adapters should translate provider-specific data into this stable CRM contract or call the reusable service layer directly rather than adding provider-specific columns to the Contact schema.
