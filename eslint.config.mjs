import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  { ignores: ['**/dist/**', '**/dev-dist/**', '**/node_modules/**', '.docs/**', '**/*.d.ts'] },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  { files: ['**/*.mjs', '**/*.js'], ...tseslint.configs.disableTypeChecked },

  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      // Nest resolves constructor injections through decorator metadata: those imports must stay value imports.
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },

  { files: ['apps/web/**/*.{ts,tsx}'], ...react.configs.flat.recommended },
  { files: ['apps/web/**/*.{ts,tsx}'], ...react.configs.flat['jsx-runtime'] },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    settings: { react: { version: 'detect' } },
    languageOptions: { globals: globals.browser },
  },
  { files: ['apps/web/**/*.{ts,tsx}'], ...reactHooks.configs.flat.recommended },
  { files: ['apps/web/**/*.tsx'], ...jsxA11y.flatConfigs.strict },
  {
    files: ['apps/web/src/**/*.tsx'],
    rules: {
      // Every UI string comes from src/i18n. Both rules fail the build on a literal sneaking into JSX.
      'react/jsx-no-literals': [
        'error',
        { noStrings: true, ignoreProps: true, allowedStrings: ['%', '/', '–', '×', '+', '−', '…', '⌘', '·'] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name=/^(aria-label|aria-description|aria-roledescription|title|placeholder|alt)$/] > Literal[value=/\\S/]',
          message: 'UI strings must come from the i18n dictionary (src/i18n).',
        },
      ],
    },
  },
);
