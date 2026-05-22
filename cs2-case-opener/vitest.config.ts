import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 'node' avoids needing a jsdom dep for pure-logic tests; UI-level tests
    // can opt into 'jsdom' per-file with the @vitest-environment jsdom comment.
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{js,ts}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      all: true,
    },
  },
});
