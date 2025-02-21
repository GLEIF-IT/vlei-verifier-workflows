// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ...eslint.configs.recommended,
    files: ['**/*.ts'], // restricts linting to TypeScript files
  },
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  prettierConfig // blocks any eslint formatting rules that would conflict with Prettier
);
