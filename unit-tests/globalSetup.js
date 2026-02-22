// globalSetup.js
// Jest will run this once before any test files execute.
// We copy every existing namespace file to a ".orig" backup so that
// test code can freely clear/modify the storage without ever touching
// the real dataset.

const { backupAllData } = require('../src/api/storage');

module.exports = async () => {
  await backupAllData();
};