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
import * as migration_20260907_161450_association_memberships from './20260907_161450_association_memberships';

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
    up: migration_20260907_161450_association_memberships.up,
    down: migration_20260907_161450_association_memberships.down,
    name: '20260907_161450_association_memberships'
  },
];
