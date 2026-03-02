const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/','/__tests__/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // only match TypeScript test files so generated JS is ignored
  testMatch: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
  testPathIgnorePatterns: ['\\.d\\.ts$'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowJs: true,
      },
    }],
  },
};
