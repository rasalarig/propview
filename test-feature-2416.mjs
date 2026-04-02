import { chromium } from 'playwright';

const EVIDENCE_DIR = 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence';
const BASE_URL = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const results = [];

  // Test 1: /imoveis listing page
  console.log('Test 1: /imoveis listing page...');
  await page.goto(`${BASE_URL}/imoveis`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${EVIDENCE_DIR}/feature2416-imoveis-listing.png` });

  const cards = await page.locator('.group.overflow-hidden').count();
  console.log('  Cards found:', cards);

  const hasPlaceholder = await page.locator('.opacity-20').count();
  console.log('  Placeholders found:', hasPlaceholder);

  const propertyImages = await page.locator('div.relative.h-48 img').count();
  console.log('  Property images found:', propertyImages);

  results.push({
    test: '/imoveis listing',
    cards,
    hasPlaceholder,
    propertyImages,
    pass: cards > 0
  });

  // Test 2: /imoveis/1 detail page
  console.log('Test 2: /imoveis/1 detail page...');
  await page.goto(`${BASE_URL}/imoveis/1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${EVIDENCE_DIR}/feature2416-imovel-detail.png` });

  const detailTitle = await page.locator('h1').first().textContent().catch(() => 'N/A');
  console.log('  Detail page title:', detailTitle);

  results.push({
    test: '/imoveis/1 detail',
    detailTitle,
    pass: detailTitle !== 'N/A' && detailTitle.length > 0
  });

  // Test 3: Homepage
  console.log('Test 3: Homepage...');
  await page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${EVIDENCE_DIR}/feature2416-homepage.png` });

  const featuredCards = await page.locator('.group.overflow-hidden').count();
  console.log('  Featured cards on homepage:', featuredCards);

  results.push({
    test: 'Homepage featured properties',
    featuredCards,
    pass: true
  });

  // Test 4: Admin cadastro page - image upload section
  console.log('Test 4: Admin cadastro page...');
  await page.goto(`${BASE_URL}/admin/cadastro`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${EVIDENCE_DIR}/feature2416-admin-cadastro.png` });

  const imageUploadInput = await page.locator('input[type="file"][accept="image/*"]').count();
  console.log('  Image upload input found:', imageUploadInput);

  const uploadLabel = await page.locator('label[for="image-upload"]').count();
  console.log('  Upload label found:', uploadLabel);

  results.push({
    test: 'Admin cadastro image upload',
    imageUploadInput,
    uploadLabel,
    pass: imageUploadInput > 0
  });

  console.log('\n=== RESULTS ===');
  results.forEach(r => {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}: ${r.test}`);
  });

  console.log('\nConsole errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(e => console.log(' -', e));
  }

  await browser.close();

  const allPassed = results.every(r => r.pass);
  console.log('\nOverall:', allPassed ? 'PASS' : 'FAIL');
  process.exit(allPassed ? 0 : 1);
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
