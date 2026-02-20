module.exports = {
  testEnvironment: 'jsdom',
  transform: { '^.+\\.(js|jsx)$': 'babel-jest' },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    "\\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
    "\\\.(css|less|scss)$": "<rootDir>/__mocks__/styleMock.js"
  }
};