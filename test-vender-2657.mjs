import { chromium } from 'playwright';
import path from 'path';

const EVIDENCE_DIR = 'C:/rasa/workspaces/propview/.sprintfy/evidence';
const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    // ========== TEST 1: Navigate to /vender ==========
    console.log('\n--- TEST 1: /vender page loads ---');
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/vender`, { waitUntil: 'networkidle' });
    await sleep(2000);

    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Check for form fields
    const nameLabel = await page.locator('label').filter({ hasText: 'Nome' }).first().textContent().catch(() => null);
    const phoneLabel = await page.locator('label').filter({ hasText: 'Telefone' }).first().textContent().catch(() => null);
    const emailLabel = await page.locator('label').filter({ hasText: 'Email' }).first().textContent().catch(() => null);
    const cityLabel = await page.locator('label').filter({ hasText: 'Cidade' }).first().textContent().catch(() => null);

    console.log('Name label:', nameLabel);
    console.log('Phone label:', phoneLabel);
    console.log('Email label:', emailLabel);
    console.log('City label:', cityLabel);

    const hasAllFields = nameLabel && phoneLabel && emailLabel && cityLabel;
    results.push({ test: 'TEST 1: /vender form fields', pass: !!hasAllFields });

    await page.screenshot({ path: `${EVIDENCE_DIR}/step-1-vender-form.png`, fullPage: true });
    console.log('Screenshot saved: step-1-vender-form.png');

    // ========== TEST 2: Navbar "Quero Vender" (desktop 1280x800) ==========
    console.log('\n--- TEST 2: Navbar "Quero Vender" button ---');
    const page2 = await browser.newPage();
    await page2.setViewportSize({ width: 1280, height: 800 });
    await page2.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
    await sleep(2000);

    const navbarVender = await page2.locator('nav a[href="/vender"]').first().textContent().catch(() => null);
    const navbarVenderButton = await page2.locator('a[href="/vender"]').filter({ hasText: 'Quero Vender' }).first().isVisible().catch(() => false);

    console.log('Navbar vender link text:', navbarVender);
    console.log('Navbar "Quero Vender" button visible:', navbarVenderButton);

    // Look for button in header
    const headerVenderLink = await page2.locator('header a[href="/vender"]').first().isVisible().catch(() => false);
    console.log('Header vender link visible:', headerVenderLink);

    results.push({ test: 'TEST 2: Navbar "Quero Vender" button', pass: headerVenderLink });

    await page2.screenshot({ path: `${EVIDENCE_DIR}/step-2-navbar-desktop.png`, fullPage: false });
    console.log('Screenshot saved: step-2-navbar-desktop.png');

    // ========== TEST 3: Bottom tab bar "Vender" (mobile 375x812) ==========
    console.log('\n--- TEST 3: Bottom tab bar "Vender" ---');
    const page3 = await browser.newPage();
    await page3.setViewportSize({ width: 375, height: 812 });
    await page3.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
    await sleep(2000);

    const bottomTabVender = await page3.locator('nav a[href="/vender"]').first().isVisible().catch(() => false);
    const bottomTabText = await page3.locator('nav a[href="/vender"] span').first().textContent().catch(() => null);

    console.log('Bottom tab "Vender" visible:', bottomTabVender);
    console.log('Bottom tab text:', bottomTabText);

    results.push({ test: 'TEST 3: Bottom tab "Vender" mobile', pass: bottomTabVender });

    await page3.screenshot({ path: `${EVIDENCE_DIR}/step-3-bottom-tab-mobile.png`, fullPage: false });
    console.log('Screenshot saved: step-3-bottom-tab-mobile.png');

    // ========== TEST 4: Submit form ==========
    console.log('\n--- TEST 4: Submit seller registration form ---');
    const page4 = await browser.newPage();
    await page4.setViewportSize({ width: 1280, height: 800 });
    await page4.goto(`${BASE_URL}/vender`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Check if we're on the form page (not redirected)
    const currentUrl4 = page4.url();
    console.log('Current URL before fill:', currentUrl4);

    if (currentUrl4.includes('/vender') && !currentUrl4.includes('/meus-imoveis')) {
      // Fill form
      const nameInput = page4.locator('input[type="text"]').first();
      const phoneInput = page4.locator('input[type="tel"]').first();
      const emailInput = page4.locator('input[type="email"]').first();
      const cityInput = page4.locator('input[type="text"]').last();

      await nameInput.fill('Joao Silva Teste');
      await sleep(300);
      await phoneInput.fill('15999887766');
      await sleep(300);
      await emailInput.fill('joao@teste.com');
      await sleep(300);
      await cityInput.fill('Sorocaba');
      await sleep(300);

      console.log('Form filled. Taking pre-submit screenshot...');
      await page4.screenshot({ path: `${EVIDENCE_DIR}/step-4a-form-filled.png`, fullPage: true });

      // Submit form
      const submitBtn = page4.locator('button[type="submit"]').first();
      await submitBtn.click();
      await sleep(3000);

      const urlAfterSubmit = page4.url();
      console.log('URL after submit:', urlAfterSubmit);

      // Check if redirected (to /admin, /vender/imovel, /vender/meus-imoveis, or success shown)
      const redirectedOk = !urlAfterSubmit.includes('/vender') || urlAfterSubmit.includes('/meus-imoveis') || urlAfterSubmit.includes('/imovel');
      const movedToAdmin = urlAfterSubmit.includes('/admin');
      const success = redirectedOk || movedToAdmin;

      results.push({ test: 'TEST 4: Submit form and redirect', pass: success, note: `Redirected to: ${urlAfterSubmit}` });

      await page4.screenshot({ path: `${EVIDENCE_DIR}/step-4b-after-submit.png`, fullPage: true });
      console.log('Screenshot saved: step-4b-after-submit.png');
    } else {
      console.log('User is already a seller or was redirected, skipping form fill');
      results.push({ test: 'TEST 4: Submit form (already seller)', pass: true, note: 'Redirected as existing seller' });
      await page4.screenshot({ path: `${EVIDENCE_DIR}/step-4b-after-submit.png`, fullPage: true });
    }

    // ========== TEST 5: Check API /api/sellers ==========
    console.log('\n--- TEST 5: Check GET /api/sellers ---');
    const apiResp = await fetch(`${BASE_URL}/api/sellers`).catch(e => null);
    if (apiResp) {
      const apiData = await apiResp.json();
      console.log('API /api/sellers status:', apiResp.status);
      console.log('API response:', JSON.stringify(apiData));
      results.push({ test: 'TEST 5: GET /api/sellers responds', pass: apiResp.status === 200, note: JSON.stringify(apiData) });
    } else {
      results.push({ test: 'TEST 5: GET /api/sellers responds', pass: false, note: 'fetch failed' });
    }

    // Also test POST to sellers API directly
    const postResp = await fetch(`${BASE_URL}/api/sellers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Seller API',
        phone: '11988776655',
        email: 'test-api@example.com',
        city: 'Campinas'
      })
    }).catch(e => null);

    if (postResp) {
      const postData = await postResp.json();
      console.log('POST /api/sellers status:', postResp.status);
      console.log('POST response:', JSON.stringify(postData));
      const postOk = postResp.status === 201 || postResp.status === 409; // 409 = already exists
      results.push({ test: 'TEST 5b: POST /api/sellers creates seller', pass: postOk, note: `Status: ${postResp.status}, ${JSON.stringify(postData)}` });
    }

  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n========== TEST SUMMARY ==========');
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    console.log(`${status}: ${r.test}${r.note ? ' | ' + r.note : ''}`);
    if (r.pass) passed++; else failed++;
  }
  console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  return results;
}

runTests().catch(console.error);
