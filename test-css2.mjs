import { chromium } from './node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';

const evidenceDir = './sprintfy-evidence';
mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const tests = [
  { url: 'http://localhost:3000', name: 'homepage', file: `${evidenceDir}/step-1-homepage.png` },
  { url: 'http://localhost:3000/imoveis', name: 'imoveis', file: `${evidenceDir}/step-2-imoveis.png` },
  { url: 'http://localhost:3000/imoveis/1', name: 'imovel-detail', file: `${evidenceDir}/step-3-imovel-detail.png` },
  { url: 'http://localhost:3000/busca?q=terreno', name: 'busca', file: `${evidenceDir}/step-4-busca.png` },
  { url: 'http://localhost:3000/admin', name: 'admin', file: `${evidenceDir}/step-5-admin.png` },
  { url: 'http://localhost:3000/admin/cadastro', name: 'admin-cadastro', file: `${evidenceDir}/step-6-admin-cadastro.png` },
];

for (const p of tests) {
  try {
    await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: p.file, fullPage: true });
    
    const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    const title = await page.title();
    console.log(`${p.name}: bg="${bg}" title="${title}"`);
  } catch (e) {
    console.log(`${p.name}: ERROR - ${e.message}`);
    try {
      await page.screenshot({ path: p.file, fullPage: true });
    } catch {}
  }
}

await browser.close();
console.log('Done.');
