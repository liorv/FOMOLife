const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.FOMO_BASE || 'http://localhost:1234/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // ensure People tab is empty for a clean test
    await page.evaluate(() => localStorage.removeItem('fomo_life_data'));
    await page.reload({ waitUntil: 'networkidle2' });

    // open a task editor
    if (!(await page.$('.item-list li'))) {
      await page.type('.add-bar input', 'ci task');
      await page.click('.add-bar button');
      await page.waitForSelector('.item-list li');
    }

    await page.click('.item-list li');
    await page.waitForSelector('.side-editor .add-person-bar input', { timeout: 5000 });

    // type a query when there are no people
    const q = 'noone';
    await page.type('.side-editor .add-person-bar input', q);

    const hasDropdown = await page.$('.side-editor .search-suggestions');
    const hasInline = await page.$('.side-editor .suggestion-inline');

    console.log('search-suggestions present:', !!hasDropdown);
    console.log('suggestion-inline present:', !!hasInline);

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('error checking suggestion inline:', err && err.message);
    await browser.close();
    process.exit(2);
  }
})();