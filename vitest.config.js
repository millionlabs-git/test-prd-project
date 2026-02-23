import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom to simulate a browser environment for DOM and localStorage APIs.
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    // Reset mocks automatically between tests.
    clearMocks: true,
    restoreMocks: true,
  },
});
