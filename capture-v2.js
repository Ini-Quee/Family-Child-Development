const puppeteer = require('puppeteer');
const path = require('path');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const screens = [
  'login',
  'register',
  'child-select',
  'child-pin',
  'parent-dash',
  'child-home',
  'add-chore',
  'approvals',
  'wallet',
  'badges',
  'screen-time',
  'child-progress',
];

async function captureScreens() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  const htmlPath = path.join(__dirname, 'wireframes-v2.html');
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  await sleep(2000);

  for (const screenId of screens) {
    console.log(`Capturing v2: ${screenId}`);
    await page.evaluate((id) => {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      const el = document.getElementById('screen-' + id);
      if (el) el.classList.add('active');
      const buttons = document.querySelectorAll('.nav button');
      buttons.forEach(b => {
        if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(id)) {
          b.classList.add('active');
        }
      });
    }, screenId);
    await sleep(500);

    const phone = await page.$('.phone.active');
    if (phone) {
      const outputPath = path.join(__dirname, 'docs', 'images', 'screens', `v2-${screenId}.png`);
      await phone.screenshot({ path: outputPath, type: 'png' });
      console.log(`  -> Saved: v2-${screenId}.png`);
    }
  }

  await browser.close();
  console.log('\nDone!');
}

captureScreens().catch(console.error);
