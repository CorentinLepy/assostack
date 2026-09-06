import * as migration_20260906_205240_initial_schema from './20260906_205240_initial_schema';
import * as migration_20260906_210752_cms_foundation from './20260906_210752_cms_foundation';

export const migrations = [
  {
    up: migration_20260906_205240_initial_schema.up,
    down: migration_20260906_205240_initial_schema.down,
    name: '20260906_205240_initial_schema',
  },
  {
    up: migration_20260906_210752_cms_foundation.up,
    down: migration_20260906_210752_cms_foundation.down,
    name: '20260906_210752_cms_foundation'
  },
];
