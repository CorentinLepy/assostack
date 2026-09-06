import * as migration_20260906_205240_initial_schema from './20260906_205240_initial_schema';
import * as migration_20260906_210752_cms_foundation from './20260906_210752_cms_foundation';
import * as migration_20260906_210900_cms_slug_uniqueness from './20260906_210900_cms_slug_uniqueness';

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
];
