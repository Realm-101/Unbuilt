import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/client/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/client/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/types/**',
        '**/scripts/**',
        '**/__tests__/**',
        '**/coverage/**',
        '**/migrations/**'
      ],
      include: [
        'server/**/*.ts'
      ],
      all: true,
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70
    },
    setupFiles: ['./server/__tests__/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': new URL('./server', import.meta.url).pathname,
      '@shared': new URL('./shared', import.meta.url).pathname,
    },
  },
});