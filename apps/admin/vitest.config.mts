import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/int/**/*.int.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
