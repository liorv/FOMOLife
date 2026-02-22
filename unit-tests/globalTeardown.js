// globalTeardown.js
// This runs after all tests have finished.  We restore whatever was
// backed up in globalSetup so the developer’s data file returns to its
// original state.

const { restoreAllData } = require('../src/api/storage');

module.exports = async () => {
  await restoreAllData();
};