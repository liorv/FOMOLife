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
    const editorSelector = '.side-editor .add-person-bar input, .inline-editor .add-person-bar input';
    await page.waitForSelector(editorSelector, { timeout: 5000 });

    // type 'a' to match Alice
    await page.type(editorSelector, 'A');

    // wait for the dropdown to appear and ensure it has a solid background
    const dropdownSelector = '.side-editor .search-suggestions.dropdown, .inline-editor .search-suggestions.dropdown';
    await page.waitForSelector(dropdownSelector, { timeout: 3000 });
    const dropdownBg = await page.evaluate(sel => window.getComputedStyle(document.querySelector(sel)).backgroundColor, dropdownSelector);
    console.log('→ dropdown background:', dropdownBg);

    // wait for suggestion rows inside the dropdown
    const suggestionRowSel = '.side-editor .search-suggestions.dropdown .suggestion-row, .inline-editor .search-suggestions.dropdown .suggestion-row';
    await page.waitForSelector(suggestionRowSel, { timeout: 3000 });
    const suggestions = await page.evaluate(() => Array.from(document.querySelectorAll(' .side-editor .search-suggestions.dropdown .suggestion-row, .inline-editor .search-suggestions.dropdown .suggestion-row')).map(r => r.textContent.trim()));

    console.log('→ suggestions:', suggestions);

    // click first suggestion and assert it became a task-person-row
    await page.click(suggestionRowSel);
    const taskPersonSel = '.side-editor .task-person-row, .inline-editor .task-person-row';
    await page.waitForSelector(taskPersonSel, { timeout: 3000 });
    const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.side-editor .task-person-row, .inline-editor .task-person-row')).map(r => r.querySelector('.person-name')?.textContent?.trim()));

    console.log('→ added rows:', rows);

    // now clear input and type 'A' again — Alice should no longer be suggested
    await page.click(editorSelector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type(editorSelector, 'A');

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