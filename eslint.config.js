// ESLint 9 flat configuration enforcing TypeScript, React Hooks, and FSD boundaries
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: '@app/**', group: 'internal', position: 'before' },
            { pattern: '@pages/**', group: 'internal', position: 'before' },
            { pattern: '@widgets/**', group: 'internal', position: 'before' },
            { pattern: '@features/**', group: 'internal', position: 'before' },
            { pattern: '@entities/**', group: 'internal', position: 'before' },
            { pattern: '@shared/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/pages', from: './src/app' },
            { target: './src/widgets', from: './src/app' },
            { target: './src/widgets', from: './src/pages' },
            { target: './src/features', from: './src/app' },
            { target: './src/features', from: './src/pages' },
            { target: './src/features', from: './src/widgets' },
            { target: './src/entities', from: './src/app' },
            { target: './src/entities', from: './src/pages' },
            { target: './src/entities', from: './src/widgets' },
            { target: './src/entities', from: './src/features' },
            { target: './src/shared', from: './src/app' },
            { target: './src/shared', from: './src/pages' },
            { target: './src/shared', from: './src/widgets' },
            { target: './src/shared', from: './src/features' },
            { target: './src/shared', from: './src/entities' },
          ],
        },
      ],
    },
  },
);
