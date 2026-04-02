import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'vite.config.js', 'scripts/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs', '*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: false,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'max-lines': ['warn', { max: 360, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['src/types/domain.ts'],
    rules: {
      'max-lines': 'off',
    },
  }
);
