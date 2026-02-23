import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals used in source files.
        ...globals.browser,
        // Node globals used in config / tooling.
        ...globals.node,
      },
    },
    rules: {
      // Warn on declared-but-unused variables (catches typos and dead code).
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Always allow console — we intentionally use console.warn / console.error.
      'no-console': 'off',
      // Require strict equality checks.
      eqeqeq: 'error',
      // Ban legacy var declarations.
      'no-var': 'error',
      // Prefer const for bindings that are never re-assigned.
      'prefer-const': 'warn',
    },
  },
];
