module.exports = {
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules', '<rootDir>'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  globalSetup: '<rootDir>/unit-tests/globalSetup.js',
  globalTeardown: '<rootDir>/unit-tests/globalTeardown.js',
  // run files in band to avoid filesystem races on the shared data file
  maxWorkers: 1,
};
