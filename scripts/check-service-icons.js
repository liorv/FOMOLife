const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.FOMO_BASE || 'http://localhost:1234/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // navigate to People tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.tabs button'));
      const peopleBtn = btns.find(b => /people/i.test(b.textContent || ''));
      if (peopleBtn) peopleBtn.click();
    });

    await page.waitForSelector('.add-bar input', { timeout: 3000 });

    // add a temporary person
    const name = 'ci-test-' + Date.now();
    await page.type('.add-bar input', name);
    await page.click('.add-bar button');

    // wait for new person chip
    await page.waitForFunction(n => !!Array.from(document.querySelectorAll('.person-chip')).find(p => p.textContent && p.textContent.indexOf(n) !== -1), { timeout: 3000 }, name);

    const result = await page.evaluate(n => {
      const chip = Array.from(document.querySelectorAll('.person-chip')).find(p => p.textContent && p.textContent.indexOf(n) !== -1);
      if (!chip) return { found: false };
      const imgs = Array.from(chip.querySelectorAll('img.service-icon'));
      return {
        found: true,
        imgCount: imgs.length,
        imgs: imgs.map(i => ({ srcAttr: i.getAttribute('src'), src: i.src, complete: !!i.complete, naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight }))
      };
    }, name);

    console.log('→ person chip present:', result.found);
    console.log('→ service-icon img count:', result.imgCount || 0);
    (result.imgs || []).forEach((r, i) => console.log(`#${i + 1}`, r));

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('error checking service icons:', err && err.message);
    await browser.close();
    process.exit(2);
  }
})();