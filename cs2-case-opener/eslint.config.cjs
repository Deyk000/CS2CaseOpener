// eslint.config.cjs - Flat config compatible with ESLint v10
const eslintRecommended = require('eslint/conf/eslint-recommended');
const eslintRecommendedWithJSX = require('eslint/conf/eslint-recommended-with-jsx');
const jsdocPlugin = require('eslint-plugin-jsdoc');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  // Base ESLint recommended rules
  eslintRecommended,
  // Include JSX recommended if using .jsx files
  eslintRecommendedWithJSX,
  // Project-specific configuration
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        browser: true,
        node: true,
        es2021: true,
      },
    },
    plugins: {
      jsdoc: jsdocPlugin,
    },
    rules: {
      // Add project-specific rule overrides here
    },
    ignores: ['dist/', 'node_modules/'],
    // Enable recommended rules from the jsdoc plugin
    ...jsdocPlugin.configs.recommended,
  },
];
