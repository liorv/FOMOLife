const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.FOMO_BASE || 'http://localhost:1234/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    // seed app with known people
    const seed = { tasks: [{ text: 'seed task', done: false, people: [] }], people: [{ name: 'Alice', methods: { sms: false, discord: false, whatsapp: false } }, { name: 'Bob', methods: { sms: true, discord: false, whatsapp: false } }], projects: [], dreams: [] };
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.evaluate(s => localStorage.setItem('fomo_life_data', JSON.stringify(s)), seed);
    await page.reload({ waitUntil: 'networkidle2' });

    // open task editor
    await page.waitForSelector('.item-list li', { timeout: 5000 });
    await page.click('.item-list li');
    await page.waitForSelector('.side-editor .add-person-bar input', { timeout: 5000 });

    // type 'a' to match Alice
    await page.type('.side-editor .add-person-bar input', 'A');

    // wait for the dropdown to appear and ensure it has a solid background
    await page.waitForSelector('.side-editor .search-suggestions.dropdown', { timeout: 3000 });
    const dropdownBg = await page.evaluate(() => window.getComputedStyle(document.querySelector('.side-editor .search-suggestions.dropdown')).backgroundColor);
    console.log('→ dropdown background:', dropdownBg);

    // wait for suggestion rows inside the dropdown
    await page.waitForSelector('.side-editor .search-suggestions.dropdown .suggestion-row', { timeout: 3000 });
    const suggestions = await page.evaluate(() => Array.from(document.querySelectorAll('.side-editor .search-suggestions.dropdown .suggestion-row')).map(r => r.textContent.trim()));

    console.log('→ suggestions:', suggestions);

    // click first suggestion and assert it became a task-person-row
    await page.click('.side-editor .search-suggestions.dropdown .suggestion-row');
    await page.waitForSelector('.side-editor .task-person-row', { timeout: 3000 });
    const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.side-editor .task-person-row')).map(r => r.querySelector('.person-name')?.textContent?.trim()));

    console.log('→ added rows:', rows);

    // now clear input and type 'A' again — Alice should no longer be suggested
    await page.click('.side-editor .add-person-bar input', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('.side-editor .add-person-bar input', 'A');

    // wait briefly to allow suggestions to update
    await new Promise(res => setTimeout(res, 300));
    const remainingSuggestions = await page.evaluate(() => Array.from(document.querySelectorAll('.side-editor .search-suggestions.dropdown .suggestion-row')).map(r => r.textContent.trim()));
    console.log('→ remaining suggestions after adding Alice:', remainingSuggestions);

    if (remainingSuggestions.includes('Alice')) throw new Error('Alice still appears in suggestions after being added');

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('error checking autocomplete suggestions:', err && err.message);
    await browser.close();
    process.exit(2);
  }
})();