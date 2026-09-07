# CRM contact tags

Contact Tags provide a small tenant-scoped taxonomy for classifying CRM Contacts.

They are intentionally simpler than a segmentation engine. A Tag answers questions such as “is this Contact a potential sponsor?”, “has this person volunteered before?” or “does this Contact belong to a follow-up category?” without creating another person/member table or embedding provider-specific labels in the CRM model.

## Model

Each Contact Tag belongs to one organization and contains:

- a required human-readable name;
- a normalized slug;
- an active/archived lifecycle;
- a managed archive timestamp;
- an optional short staff-facing description.

Tags do not use unlimited Payload version history. Archiving is preferred over deletion when a taxonomy entry may still classify existing Contacts.

## Slugs and tenant uniqueness

A slug is normalized to lowercase ASCII with dash separators. If no slug is provided when the Tag is created, AssoStack derives it from the name.

The same slug may exist in different organizations. Inside one organization, duplicate slugs are rejected server-side. This preserves tenant independence while providing a stable identifier for imports, integrations and future filtering.

## Contact assignments

A Contact can reference multiple Tags. Every supplied Tag ID is reloaded and checked server-side against the Contact organization before the Contact is written.

The tenant-aware admin UI is useful for normal operation, but it is not the security boundary: manually crafted cross-tenant IDs are rejected as well.

Archived Tags can remain attached to historical Contacts. Archiving therefore does not silently rewrite Contact classification history.

## Access and privacy

Contact Tags are CRM staff data:

- platform administrators can operate across tenants;
- organization administrators and current staff `editor` users can manage Tags in organizations where they have that role;
- deletion is restricted to organization administrators;
- ordinary `member` users cannot read the Tag collection.

Tags should classify Contacts, not contain sensitive free-form dossiers. Sensitive relationship history belongs in deliberately scoped CRM records and future privacy/consent records.

## What Tags are not

This first taxonomy does not implement:

- a dynamic segment expression language;
- saved marketing audiences;
- automatic tagging rules;
- arbitrary custom fields;
- hierarchical taxonomies;
- provider-specific labels.

Future segments can build on Contact fields plus Tags once real association filtering needs are known, rather than freezing a generic query DSL too early.
