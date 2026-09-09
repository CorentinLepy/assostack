import * as migration_20260906_205240_initial_schema from './20260906_205240_initial_schema';
import * as migration_20260906_210752_cms_foundation from './20260906_210752_cms_foundation';
import * as migration_20260906_210900_cms_slug_uniqueness from './20260906_210900_cms_slug_uniqueness';
import * as migration_20260906_214736_site_configuration from './20260906_214736_site_configuration';
import * as migration_20260906_223611_page_sections from './20260906_223611_page_sections';
import * as migration_20260906_225243_builtin_routes from './20260906_225243_builtin_routes';
import * as migration_20260907_063504_site_sync_job from './20260907_063504_site_sync_job';
import * as migration_20260907_065526_contact_core from './20260907_065526_contact_core';
import * as migration_20260907_070732_crm_interactions from './20260907_070732_crm_interactions';
import * as migration_20260907_072333_crm_tasks from './20260907_072333_crm_tasks';
import * as migration_20260907_073402_crm_contact_tags from './20260907_073402_crm_contact_tags';
import * as migration_20260907_132550_crm_privacy from './20260907_132550_crm_privacy';
import * as migration_20260907_161509_crm_memberships from './20260907_161509_crm_memberships';
import * as migration_20260907_162849_events_registrations from './20260907_162849_events_registrations';
import * as migration_20260907_164047_volunteer_shifts_assignments from './20260907_164047_volunteer_shifts_assignments';
import * as migration_20260907_180657_partnerships from './20260907_180657_partnerships';
import * as migration_20260907_181843_crm_notes from './20260907_181843_crm_notes';
import * as migration_20260907_193056_crm_custom_fields from './20260907_193056_crm_custom_fields';
import * as migration_20260907_201705_forms_submissions from './20260907_201705_forms_submissions';
import * as migration_20260907_212207_association_documents from './20260907_212207_association_documents';
import * as migration_20260907_215240_integrations_foundation from './20260907_215240_integrations_foundation';
import * as migration_20260908_142101_integrations_webhook_events from './20260908_142101_integrations_webhook_events';

export const migrations = [
  {
    up: migration_20260906_205240_initial_schema.up,
    down: migration_20260906_205240_initial_schema.down,
    name: '20260906_205240_initial_schema',
  },
  {
    up: migration_20260906_210752_cms_foundation.up,
    down: migration_20260906_210752_cms_foundation.down,
    name: '20260906_210752_cms_foundation',
  },
  {
    up: migration_20260906_210900_cms_slug_uniqueness.up,
    down: migration_20260906_210900_cms_slug_uniqueness.down,
    name: '20260906_210900_cms_slug_uniqueness',
  },
  {
    up: migration_20260906_214736_site_configuration.up,
    down: migration_20260906_214736_site_configuration.down,
    name: '20260906_214736_site_configuration',
  },
  {
    up: migration_20260906_223611_page_sections.up,
    down: migration_20260906_223611_page_sections.down,
    name: '20260906_223611_page_sections',
  },
  {
    up: migration_20260906_225243_builtin_routes.up,
    down: migration_20260906_225243_builtin_routes.down,
    name: '20260906_225243_builtin_routes',
  },
  {
    up: migration_20260907_063504_site_sync_job.up,
    down: migration_20260907_063504_site_sync_job.down,
    name: '20260907_063504_site_sync_job',
  },
  {
    up: migration_20260907_065526_contact_core.up,
    down: migration_20260907_065526_contact_core.down,
    name: '20260907_065526_contact_core',
  },
  {
    up: migration_20260907_070732_crm_interactions.up,
    down: migration_20260907_070732_crm_interactions.down,
    name: '20260907_070732_crm_interactions',
  },
  {
    up: migration_20260907_072333_crm_tasks.up,
    down: migration_20260907_072333_crm_tasks.down,
    name: '20260907_072333_crm_tasks',
  },
  {
    up: migration_20260907_073402_crm_contact_tags.up,
    down: migration_20260907_073402_crm_contact_tags.down,
    name: '20260907_073402_crm_contact_tags',
  },
  {
    up: migration_20260907_132550_crm_privacy.up,
    down: migration_20260907_132550_crm_privacy.down,
    name: '20260907_132550_crm_privacy',
  },
  {
    up: migration_20260907_161509_crm_memberships.up,
    down: migration_20260907_161509_crm_memberships.down,
    name: '20260907_161509_crm_memberships',
  },
  {
    up: migration_20260907_162849_events_registrations.up,
    down: migration_20260907_162849_events_registrations.down,
    name: '20260907_162849_events_registrations',
  },
  {
    up: migration_20260907_164047_volunteer_shifts_assignments.up,
    down: migration_20260907_164047_volunteer_shifts_assignments.down,
    name: '20260907_164047_volunteer_shifts_assignments',
  },
  {
    up: migration_20260907_180657_partnerships.up,
    down: migration_20260907_180657_partnerships.down,
    name: '20260907_180657_partnerships',
  },
  {
    up: migration_20260907_181843_crm_notes.up,
    down: migration_20260907_181843_crm_notes.down,
    name: '20260907_181843_crm_notes',
  },
  {
    up: migration_20260907_193056_crm_custom_fields.up,
    down: migration_20260907_193056_crm_custom_fields.down,
    name: '20260907_193056_crm_custom_fields',
  },
  {
    up: migration_20260907_201705_forms_submissions.up,
    down: migration_20260907_201705_forms_submissions.down,
    name: '20260907_201705_forms_submissions',
  },
  {
    up: migration_20260907_212207_association_documents.up,
    down: migration_20260907_212207_association_documents.down,
    name: '20260907_212207_association_documents',
  },
  {
    up: migration_20260907_215240_integrations_foundation.up,
    down: migration_20260907_215240_integrations_foundation.down,
    name: '20260907_215240_integrations_foundation',
  },
  {
    up: migration_20260908_142101_integrations_webhook_events.up,
    down: migration_20260908_142101_integrations_webhook_events.down,
    name: '20260908_142101_integrations_webhook_events'
  },
];
