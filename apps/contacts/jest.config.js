const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/','/__tests__/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // explicitly include TypeScript and TSX in file extensions so jest
  // picks up our test files, and define a match pattern just to be safe
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowJs: true,
      },
    }],
    '^.+\\.jsx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-react',
      ],
    }],
  },
  moduleNameMapper: {
    '^server-only$': '<rootDir>/__mocks__/server-only.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^@myorg/utils$': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
    '^@myorg/types$': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    '^@myorg/api-client$': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
    '^@myorg/storage$': path.resolve(__dirname, '../../packages/storage/src/index.ts'),
    '^@myorg/storage-client$': path.resolve(__dirname, '../../packages/storage-client/src/index.ts'),
    '^@myorg/ui$': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    // CSS modules and other style imports
    '^.+\\.module\\.css$': 'identity-obj-proxy',
    '^.+\\.(css|less|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
  },
};
