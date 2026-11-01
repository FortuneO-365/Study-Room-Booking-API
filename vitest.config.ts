import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // env.ts must run first, because app modules read environment variables when imported
    setupFiles: ['tests/setup/env.ts', 'tests/setup/hooks.ts'],
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/scripts/**', 'src/docs/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html'],
    },
  },
});