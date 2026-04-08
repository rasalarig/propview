import { chromium } from 'playwright';

const EVIDENCE_DIR = 'C:\\rasa\\workspaces\\propview\\.sprintfy\\evidence';

const browser = await chromium.launch({ headless: true });

// Test at 1280x900 - exactly what user sees
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

const requestFails = [];
page.on('requestfailed', req => requestFails.push({ url: req.url(), err: req.failure()?.errorText }));

// Homepage - just viewport (not full page)
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${EVIDENCE_DIR}\\css-viewport-home.png` }); // viewport only
console.log('Home viewport screenshot done');

// Check if the main property image/card renders
const homeContent = await page.evaluate(() => {
  const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
  const sections = document.querySelectorAll('section');
  const videos = document.querySelectorAll('video');
  const imgs = document.querySelectorAll('img');
  return {
    cardsFound: cards.length,
    sectionsFound: sections.length,
    videosFound: videos.length,
    imgsFound: imgs.length,
    bodyHTML: document.body.innerHTML.length
  };
});
console.log('Home content check:', homeContent);

// Imoveis at viewport
await page.goto('http://localhost:3000/imoveis', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${EVIDENCE_DIR}\\css-viewport-imoveis.png` });
console.log('Imoveis viewport screenshot done');

// Check property card images
const imoveisImgs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('img')).map(img => ({
    src: img.src?.substring(0, 100),
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    complete: img.complete,
    displayed: img.offsetWidth > 0 && img.offsetHeight > 0,
    width: img.offsetWidth,
    height: img.offsetHeight,
  }));
});
console.log('Imoveis images:', JSON.stringify(imoveisImgs, null, 2));

// Admin panel - full page
await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${EVIDENCE_DIR}\\css-viewport-admin.png`, fullPage: true });
console.log('Admin viewport screenshot done');

// Admin cadastro (property form)
await page.goto('http://localhost:3000/admin/cadastro', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${EVIDENCE_DIR}\\css-viewport-cadastro.png`, fullPage: true });
console.log('Cadastro viewport screenshot done');

console.log('\n=== ERRORS ===');
consoleErrors.forEach(e => console.log('CONSOLE ERROR:', e.substring(0, 300)));
requestFails.forEach(f => console.log('REQUEST FAIL:', f.url, f.err));

await browser.close();
