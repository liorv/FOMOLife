describe('utils package exports', () => {
  it('does not export client-only React hooks from the main barrel', () => {
    // require the package main index as consumers do
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const utils = require('../src');
    expect(utils.useAsyncState).toBeUndefined();
  });
});
