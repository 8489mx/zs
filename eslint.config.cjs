const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'frontend/**',
      'dist/**',
      'coverage/**',
      '**/*.json',
      'docs/**',
      'demo/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'scripts/**/*.js', 'tests/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'no-duplicate-imports': 'error',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'max-lines': ['warn', { max: 360, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['scripts/seed-demo.js'],
    rules: {
      'max-lines': 'off',
    },
  }
];
