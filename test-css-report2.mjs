import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import path from 'path';

const EVIDENCE_DIR = 'C:\\rasa\\workspaces\\propview\\.sprintfy\\evidence';

const results = {
  pages: {},
  consoleErrors: [],
  networkErrors: [],
  httpErrors: [],
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

const httpErrors = [];
page.on('response', response => {
  const url = response.url();
  const status = response.status();
  if (status >= 400) {
    httpErrors.push({ url, status });
  }
});

// ---- PAGE 1: Homepage ----
console.log('Navigating to homepage...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const homePath = `${EVIDENCE_DIR}\\css-report-home.png`;
await page.screenshot({ path: homePath, fullPage: true });
console.log('Homepage screenshot saved to:', homePath);

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

// Check stylesheets
const stylesheets = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => ({
    href: l.href,
    loaded: l.sheet !== null
  }));
});

// Check if CSS file actually loaded (200 response)
const cssCheck = await page.evaluate(async () => {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  const checks = [];
  for (const link of links) {
    try {
      const resp = await fetch(link.href);
      checks.push({ href: link.href, status: resp.status, ok: resp.ok, size: resp.headers.get('content-length') });
    } catch (e) {
      checks.push({ href: link.href, error: e.message });
    }
  }
  return checks;
});

console.log('CSS variable --background:', cssVars.background);
console.log('Body background:', bodyBg.backgroundColor);
console.log('Stylesheets:', JSON.stringify(stylesheets, null, 2));
console.log('CSS fetch check:', JSON.stringify(cssCheck, null, 2));

results.pages.homepage = { bodyBg, cssVars, stylesheets, cssCheck };

// ---- PAGE 2: Admin Leads ----
console.log('\nNavigating to admin/leads...');
await page.goto('http://localhost:3000/admin/leads', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
const adminPath = `${EVIDENCE_DIR}\\css-report-admin-leads.png`;
await page.screenshot({ path: adminPath, fullPage: true });
console.log('Admin leads screenshot saved to:', adminPath);

const adminStyles = await page.evaluate(() => {
  const body = document.body;
  return {
    bodyBg: window.getComputedStyle(body).backgroundColor,
    bodyColor: window.getComputedStyle(body).color,
  };
});
results.pages.adminLeads = adminStyles;

// ---- PAGE 3: Login ----
console.log('\nNavigating to login...');
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
const loginPath = `${EVIDENCE_DIR}\\css-report-login.png`;
await page.screenshot({ path: loginPath, fullPage: true });
console.log('Login screenshot saved to:', loginPath);

const loginStyles = await page.evaluate(() => {
  return {
    bodyBg: window.getComputedStyle(document.body).backgroundColor,
    bodyColor: window.getComputedStyle(document.body).color,
  };
});
results.pages.login = loginStyles;

// Collect errors
results.consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
results.networkErrors = networkFailures;
results.httpErrors = httpErrors;

// Save results
writeFileSync(`${EVIDENCE_DIR}\\css-report-results.json`, JSON.stringify(results, null, 2));
console.log('\n=== FINAL RESULTS ===');
console.log(JSON.stringify(results, null, 2));

await browser.close();
console.log('\nDone!');
