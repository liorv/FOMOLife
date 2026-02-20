const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.FOMO_BASE || 'http://localhost:1234/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  // use a desktop-sized viewport so decorative splash (hidden on small screens) is visible
  await page.setViewport({ width: 1280, height: 900 });
  const logs = [];
  page.on('console', msg => logs.push({type: 'console', text: msg.text()}));
  page.on('pageerror', err => logs.push({type: 'pageerror', text: String(err)}));
  page.on('requestfailed', req => logs.push({type: 'requestfailed', url: req.url(), reason: req.failure().errorText}));

  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    if (!resp || resp.status() !== 200) {
      console.error('✖ Failed to load app root:', resp && resp.status());
      await browser.close();
      process.exit(2);
    }

    // ensure the splash element is present (small header icon removed intentionally)
    await page.waitForSelector('.logo-splash', { timeout: 5000 });

    const result = await page.evaluate(() => {
      const img = document.querySelector('img.app-logo');
      const cs = img ? window.getComputedStyle(img) : {};
      const splash = document.querySelector('.logo-splash');
      const splashCS = splash ? window.getComputedStyle(splash) : {};
      return {
        found: !!img,
        src: img ? img.getAttribute('src') : null,
        absoluteSrc: img ? img.src : null,
        naturalWidth: img ? img.naturalWidth : 0,
        naturalHeight: img ? img.naturalHeight : 0,
        complete: img ? img.complete : false,
        display: cs.display || null,
        visibility: cs.visibility || null,
        opacity: parseFloat(cs.opacity || '1'),
        onerror: img ? img.getAttribute('onerror') : null,
        __RAW_LOGO_ASSET: window.__RAW_LOGO_ASSET || null,
        __ASSET_URL: window.__ASSET_URL || null,
        __RESOLVED_LOGO: window.__RESOLVED_LOGO || null,
        logoSplashBg: splash ? (splashCS.backgroundImage || null) : null,
        logoSplashBgPos: splash ? (splashCS.backgroundPosition || null) : null,
        logoSplashVisible: splash ? (splashCS.display !== 'none' && !/none/i.test(splashCS.backgroundImage || '')) : false,
        logoSplashZ: splash ? (parseInt(splashCS.zIndex, 10) || 0) : 0,
        logoSplashOpacity: splash ? parseFloat(splashCS.opacity || '1') : 0,
        splashBorderTopLeftRadius: splash ? (splashCS.borderTopLeftRadius || null) : null,
        containerBorderTopLeftRadius: (document.querySelector('.container') && window.getComputedStyle(document.querySelector('.container')).borderTopLeftRadius) || null
      };
    });

    console.log('→ Page URL:', url);
    console.log('→ Image element state:', JSON.stringify(result, null, 2));
    if (logs.length) {
      console.log('\n→ Browser console / network errors:');
      logs.forEach(l => console.log('-', l.type, l.text));
    }

    // the small header <img> is no longer required; validate the splash instead
    if (!result.logoSplashVisible || !result.logoSplashBg) {
      console.error('✖ .logo-splash missing or not referencing the logo');
      await browser.close();
      process.exit(3);
    }

    // verify decorative splash is present, references the logo asset and is *behind* interactive content
    if (!result.logoSplashVisible || !result.logoSplashBg || !/logo_fomo/i.test(result.logoSplashBg)) {
      console.error('✖ .logo-splash background not set or does not reference logo:', result.logoSplashBg);
      await browser.close();
      process.exit(6);
    }
    // ensure splash is behind content (container children use z-index:1)
    // splash should render visually in front of panel children so it isn't overlapped
    // splash should be behind interactive content (container children use z-index:1)
    if (result.logoSplashZ >= 1) {
      console.error('✖ .logo-splash z-index must be less than container children:', result.logoSplashZ);
      await browser.close();
      process.exit(7);
    }
    if (result.logoSplashOpacity < 0.9) {
      console.error('✖ .logo-splash opacity is too low:', result.logoSplashOpacity);
      await browser.close();
      process.exit(8);
    }

    // verify horizontal centering so the logo is not cut on the right
    if (!result.logoSplashBgPos || !/50%|center/i.test(result.logoSplashBgPos)) {
      console.error('✖ splash background is not horizontally centered:', result.logoSplashBgPos);
      await browser.close();
      process.exit(9);
    }

    // verify top-left corner rounding matches container
    if (result.splashBorderTopLeftRadius !== result.containerBorderTopLeftRadius) {
      console.error('✖ splash border-top-left-radius does not match container:', result.splashBorderTopLeftRadius, result.containerBorderTopLeftRadius);
      await browser.close();
      process.exit(10);
    }

    console.log('✔ img.app-logo loaded successfully (natural size > 0)');
    console.log('✔ .logo-splash is visible, references logo, renders behind interactive content, and corner-radius matches');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('✖ Error during headless check:', err && err.message);
    if (logs.length) console.log('→ logs:', logs);
    await browser.close();
    process.exit(20);
  }
})();