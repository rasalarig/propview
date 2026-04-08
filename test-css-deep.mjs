import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const EVIDENCE_DIR = 'C:\\rasa\\workspaces\\propview\\.sprintfy\\evidence';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 }
});
const page = await context.newPage();

// Capture everything
const allConsole = [];
page.on('console', msg => allConsole.push({ type: msg.type(), text: msg.text() }));

const allNetworkFails = [];
page.on('requestfailed', req => allNetworkFails.push({ url: req.url(), err: req.failure()?.errorText }));

const allResponses = [];
page.on('response', resp => {
  const url = resp.url();
  const status = resp.status();
  // Only log CSS and font failures
  if ((url.includes('.css') || url.includes('.woff') || url.includes('_next')) && status >= 400) {
    allResponses.push({ url, status });
  }
});

// ---- HOMEPAGE (full page, check reels/hero section) ----
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${EVIDENCE_DIR}\\css-deep-home-full.png`, fullPage: true });
console.log('Home full page screenshot done');

// Check if the reels/hero image loaded
const heroImageStatus = await page.evaluate(() => {
  const imgs = Array.from(document.querySelectorAll('img'));
  return imgs.map(img => ({
    src: img.src,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    complete: img.complete,
    alt: img.alt
  }));
});
console.log('Images on page:', JSON.stringify(heroImageStatus, null, 2));

// Check specific visual elements
const visualCheck = await page.evaluate(() => {
  // Check navbar
  const navbar = document.querySelector('nav') || document.querySelector('header');
  const navbarBg = navbar ? window.getComputedStyle(navbar).backgroundColor : 'not found';

  // Check if there are any elements with default white/black backgrounds (unstyled)
  const allElements = Array.from(document.querySelectorAll('*'));
  const whiteElements = [];
  for (const el of allElements.slice(0, 50)) {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (bg === 'rgb(255, 255, 255)' && el.tagName !== 'INPUT') {
      whiteElements.push({ tag: el.tagName, class: el.className?.substring(0, 50), bg });
    }
  }

  return {
    navbarBg,
    whiteElements: whiteElements.slice(0, 5),
    totalElements: allElements.length
  };
});
console.log('Visual check:', JSON.stringify(visualCheck, null, 2));

// ---- IMOVEIS PAGE ----
await page.goto('http://localhost:3000/imoveis', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${EVIDENCE_DIR}\\css-deep-imoveis.png`, fullPage: true });
console.log('Imoveis screenshot done');

// ---- BUSCA PAGE ----
await page.goto('http://localhost:3000/busca', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${EVIDENCE_DIR}\\css-deep-busca.png`, fullPage: true });
console.log('Busca screenshot done');

// Print all console errors
const errors = allConsole.filter(m => m.type === 'error');
const warnings = allConsole.filter(m => m.type === 'warning');
console.log('\n=== CONSOLE ERRORS ===');
errors.forEach(e => console.log('ERROR:', e.text.substring(0, 300)));
console.log('\n=== CONSOLE WARNINGS ===');
warnings.forEach(w => console.log('WARN:', w.text.substring(0, 200)));
console.log('\n=== NETWORK FAILURES ===');
allNetworkFails.forEach(n => console.log('FAIL:', n.url, '-', n.err));
console.log('\n=== HTTP ERRORS ===');
allResponses.forEach(r => console.log('HTTP', r.status, r.url));

await browser.close();
console.log('\nAll done!');
