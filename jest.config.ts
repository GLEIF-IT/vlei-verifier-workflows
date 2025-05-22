import { Config } from 'jest';

const config: Config = {
  // need esm preset to support esm modules
  preset: 'ts-jest',
  verbose: true,
  testEnvironment: 'node',
  // part of esm support, see: https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default config;
