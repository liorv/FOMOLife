const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.FOMO_BASE || 'http://localhost:1234/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // ensure a task exists
    const hasTask = await page.$('.item-list li');
    if (!hasTask) {
      await page.type('.add-bar input', 'ci task');
      await page.click('.add-bar button');
      await page.waitForSelector('.item-list li');
    }

    // open the first task (editor)
    await page.click('.item-list li');
    // the editor may be side-panel or inline, so look for either container
    const editorSelector = '.side-editor .add-person-bar input, .inline-editor .add-person-bar input';
    await page.waitForSelector(editorSelector, { timeout: 5000 });
    // for inline case ensure the wrapper exists
    const wrapper = await page.$('.task-editor-wrapper');
    if (wrapper) {
      console.log('inline editor wrapper present');
    }

    const name = 'task-row-' + Date.now();
    await page.type(editorSelector, name);
    await page.keyboard.press('Enter');

    // wait for the newly-added row in the task editor
    await page.waitForFunction(n => {
      const rows = Array.from(document.querySelectorAll('.side-editor .task-person-row, .inline-editor .task-person-row'));
      return !!rows.find(r => r.textContent && r.textContent.indexOf(n) !== -1);
    }, { timeout: 5000 }, name);

    const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.side-editor .task-person-row, .inline-editor .task-person-row')).map(r => ({ text: r.querySelector('.person-name')?.textContent?.trim(), imgs: r.querySelectorAll('img.service-icon').length })));

    console.log('→ task-editor rows:', rows);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('error checking task-editor rows:', err && err.message);
    await browser.close();
    process.exit(2);
  }
})();