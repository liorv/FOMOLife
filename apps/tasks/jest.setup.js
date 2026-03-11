// Jest setup file
require('@testing-library/jest-dom');
// Provide a minimal global Request implementation for tests
try {
	const mock = require('./__mocks__/next-server-mock');
	if (typeof global.Request === 'undefined') {
		// @ts-ignore
		global.Request = mock.Request;
	}
} catch (e) {
	// ignore if mock not present
}

// Ensure a test-friendly global.fetch exists so client code using fetch doesn't fail.
if (typeof global.fetch === 'undefined') {
  // jest.fn is available in the test env
  // Default: resolve to a simple successful empty JSON response. Tests can override.
  // @ts-ignore
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
}
