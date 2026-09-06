import * as migration_20260906_205240_initial_schema from './20260906_205240_initial_schema';
import * as migration_20260906_210752_cms_foundation from './20260906_210752_cms_foundation';
import * as migration_20260906_210900_cms_slug_uniqueness from './20260906_210900_cms_slug_uniqueness';
import * as migration_20260906_214736_site_configuration from './20260906_214736_site_configuration';
import * as migration_20260906_223611_page_sections from './20260906_223611_page_sections';
import * as migration_20260906_225243_builtin_routes from './20260906_225243_builtin_routes';

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
    name: '20260906_225243_builtin_routes'
  },
];
