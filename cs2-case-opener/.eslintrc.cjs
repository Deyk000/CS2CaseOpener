module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:jsdoc/recommended',
    'prettier'
  ],
  plugins: ['jsdoc'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    // Add project-specific rule overrides here
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
