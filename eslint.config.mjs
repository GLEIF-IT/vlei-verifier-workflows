// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  prettierConfig, // blocks any eslint formatting rules that would conflict with Prettier
  {
    ...eslint.configs.recommended,
    files: ['**/*.ts'],
    rules: {
      // DO NOT DISABLE ANY ADDITIONAL RULES. YOU MAY RE-ENABLE RULES AND FIX RESULTING ERRORS AT ANY TIME.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          // this set of options enforces the use of _ for unused variables
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
    },
  }
);
