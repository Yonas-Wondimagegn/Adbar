import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../../../backend/tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@adbar/common$': '<rootDir>/../../shared/common/src',
    '^@adbar/events$': '<rootDir>/../../shared/events/src',
  },
};

export default config;
