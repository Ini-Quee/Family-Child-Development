const puppeteer = require('puppeteer');
const path = require('path');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const screens = [
  'profile-survey',
  'parent-dash',
  'child-marketplace',
  'ai-coach',
  'academics',
  'athlete',
  'mood-check',
  'parent-insights',
  'evidence-review',
  'wallet',
  'screen-shop',
  'reputation',
  'badges',
];

async function captureScreens() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  const htmlPath = path.join(__dirname, 'wireframes-v3.html');
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  await sleep(2000);

  for (const screenId of screens) {
    console.log(`Capturing: ${screenId}`);

    // Activate the screen via JS
    await page.evaluate((id) => {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      const el = document.getElementById('screen-' + id);
      if (el) el.classList.add('active');
      // Also highlight the nav button
      const buttons = document.querySelectorAll('.nav button');
      buttons.forEach(b => {
        if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(id)) {
          b.classList.add('active');
        }
      });
    }, screenId);

    await sleep(500);

    // Capture the phone element
    const phone = await page.$('.phone.active');
    if (phone) {
      const outputPath = path.join(__dirname, 'docs', 'images', 'screens', `${screenId}.png`);
      await phone.screenshot({ path: outputPath, type: 'png' });
      console.log(`  -> Saved: ${screenId}.png`);
    } else {
      console.log(`  -> WARNING: No active phone found for ${screenId}`);
    }
  }

  // Capture full page
  console.log('Capturing full overview...');
  // First activate all screens briefly to make them visible
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'block');
  });
  await sleep(500);
  await page.screenshot({
    path: path.join(__dirname, 'docs', 'images', 'screens', 'overview-all.png'),
    fullPage: true,
    type: 'png',
  });
  console.log('  -> Saved: overview-all.png');

  await browser.close();
  console.log('\nDone! All screenshots saved to docs/images/screens/');
}

captureScreens().catch(console.error);
