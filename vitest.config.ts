import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**/*.ts', 'hooks/**/*.ts'],
      exclude: ['lib/providers/**', '**/*.d.ts'],
      thresholds: {
        lines: 60,
        functions: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
