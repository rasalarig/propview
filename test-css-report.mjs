import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const EVIDENCE_DIR = '/c/rasa/workspaces/propview/.sprintfy/evidence';

const results = {
  pages: {},
  consoleErrors: [],
  networkErrors: [],
  cssIssues: []
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 }
});
const page = await context.newPage();

// Capture console messages
const consoleMessages = [];
page.on('console', msg => {
  consoleMessages.push({ type: msg.type(), text: msg.text() });
});

// Capture network failures
const networkFailures = [];
page.on('requestfailed', request => {
  networkFailures.push({ url: request.url(), failure: request.failure()?.errorText });
});

const responses = [];
page.on('response', response => {
  const url = response.url();
  const status = response.status();
  if (status >= 400) {
    responses.push({ url, status });
  }
});

// ---- PAGE 1: Homepage ----
console.log('Navigating to homepage...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

await page.screenshot({ path: `${EVIDENCE_DIR}/css-report-home.png`, fullPage: true });
console.log('Homepage screenshot taken');

// Check body background color
const bodyBg = await page.evaluate(() => {
  const body = document.body;
  const style = window.getComputedStyle(body);
  return {
    backgroundColor: style.backgroundColor,
    color: style.color,
    fontFamily: style.fontFamily,
  };
});
console.log('Body styles:', bodyBg);

// Check CSS variables
const cssVars = await page.evaluate(() => {
  const root = document.documentElement;
  const style = window.getComputedStyle(root);
  return {
    background: style.getPropertyValue('--background').trim(),
    foreground: style.getPropertyValue('--foreground').trim(),
    primary: style.getPropertyValue('--primary').trim(),
  };
});
console.log('CSS variables:', cssVars);

// Check if Tailwind classes are applied
const tailwindCheck = await page.evaluate(() => {
  // Check if a known element has expected styles
  const body = document.body;
  const computedBg = window.getComputedStyle(body).backgroundColor;
  // Dark background should be roughly rgb(8, 11, 21) for 222 47% 6%
  return {
    bodyBg: computedBg,
    hasDarkTheme: computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'rgb(255, 255, 255)',
  };
});
console.log('Tailwind check:', tailwindCheck);

// Check for stylesheet links
const stylesheets = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
});
console.log('Stylesheets loaded:', stylesheets);

// Check for inline styles or style tags
const styleTags = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('style')).map(s => s.textContent?.substring(0, 200));
});
console.log('Style tags count:', styleTags.length);

results.pages.homepage = {
  bodyBg,
  cssVars,
  tailwindCheck,
  stylesheets,
  styleTagCount: styleTags.length,
};

// ---- PAGE 2: Admin Leads ----
console.log('\nNavigating to admin/leads...');
const consoleAtAdminStart = consoleMessages.length;
await page.goto('http://localhost:3000/admin/leads', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${EVIDENCE_DIR}/css-report-admin-leads.png`, fullPage: true });
console.log('Admin leads screenshot taken');

const adminBodyBg = await page.evaluate(() => {
  return window.getComputedStyle(document.body).backgroundColor;
});
results.pages.adminLeads = { bodyBg: adminBodyBg };

// ---- PAGE 3: Login ----
console.log('\nNavigating to login...');
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${EVIDENCE_DIR}/css-report-login.png`, fullPage: true });
console.log('Login screenshot taken');

const loginBodyBg = await page.evaluate(() => {
  return window.getComputedStyle(document.body).backgroundColor;
});
results.pages.login = { bodyBg: loginBodyBg };

// ---- COLLECT ALL CONSOLE ERRORS ----
results.consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
results.networkErrors = networkFailures;
results.httpErrors = responses;

// ---- SAVE RESULTS ----
writeFileSync(`${EVIDENCE_DIR}/css-report-results.json`, JSON.stringify(results, null, 2));
console.log('\n=== RESULTS ===');
console.log(JSON.stringify(results, null, 2));

await browser.close();
console.log('\nDone!');
