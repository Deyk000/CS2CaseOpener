import jsdoc from 'eslint-plugin-jsdoc';

export default [
  {
    files: ['**/*.js'],
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
      jsdoc,
    },
    rules: {
      // Add project-specific rule overrides here
    },
    ignores: ['dist/', 'node_modules/'],
    // No extends in flat config; include recommended rules manually if needed
  },
];
