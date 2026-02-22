const fs = require('fs');

(async () => {
  const {saveData, loadData, clearData} = await import('./src/api/storage.js');
  console.log('start exists', fs.existsSync('./data/fomo_life_data_default.json'));
  await clearData();
  console.log('after clear exists', fs.existsSync('./data/fomo_life_data_default.json'));

  await saveData({ tasks: [{ text: 'hello' }], projects: [], dreams: [], people: [] });
  console.log('after save exists', fs.existsSync('./data/fomo_life_data_default.json'));
  console.log('content', await loadData());

  await clearData();
  console.log('after clear2 exists', fs.existsSync('./data/fomo_life_data_default.json'));
  console.log('content now', await loadData());
})();
