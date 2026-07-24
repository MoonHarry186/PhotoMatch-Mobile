const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier/flat');
const query = require('@tanstack/eslint-plugin-query');

module.exports = defineConfig([
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/src/generated/api/**'],
  },
  ...expoConfig,
  ...query.configs['flat/recommended'],
  prettier,
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
]);
