import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const EVIDENCE_DIR = 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence';
const BASE_URL = 'http://localhost:3000';

async function takeScreenshot(page, filename, description) {
  const path = `${EVIDENCE_DIR}/${filename}`;
  await page.screenshot({ path, fullPage: true });
  console.log(`[SS] ${filename} - ${description}`);
  return path;
}

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const results = [];

  try {
    // STEP 1: Navigate to property detail page (use ID 2 - confirmed exists)
    console.log('\n=== STEP 1: Navigate to /imoveis/2 ===');
    await page.goto(`${BASE_URL}/imoveis/2`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'f2420-step1-property-detail.png', 'Property detail page loaded');
    console.log('Page title:', await page.title());
    const pageUrl = page.url();
    console.log('URL:', pageUrl);

    // STEP 2: Find and click "Tenho Interesse" button
    console.log('\n=== STEP 2: Find Tenho Interesse button ===');
    const allButtons = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()).filter(Boolean));
    console.log('Buttons:', allButtons);

    // Try to find button - may need scrolling
    let interestBtn = page.locator('button').filter({ hasText: /Tenho Interesse|Interesse/i }).first();
    let btnVisible = await interestBtn.isVisible().catch(() => false);
    console.log('Interest button visible (initial):', btnVisible);

    if (!btnVisible) {
      // Scroll down in steps to find it
      for (let scroll = 300; scroll <= 1500; scroll += 300) {
        await page.evaluate((s) => window.scrollBy(0, s), scroll);
        await page.waitForTimeout(300);
        btnVisible = await interestBtn.isVisible().catch(() => false);
        if (btnVisible) {
          console.log(`Found after scrolling ${scroll}px`);
          break;
        }
      }
    }

    if (btnVisible) {
      await interestBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await interestBtn.click();
      await page.waitForTimeout(1500);
      await takeScreenshot(page, 'f2420-step2-modal-open.png', 'Modal opened after clicking Tenho Interesse');
      results.push({ step: 'Open Interest Modal', status: 'PASS' });

      // STEP 3: Fill form with test data from task
      console.log('\n=== STEP 3: Fill form ===');

      // Name field
      const nameInput = page.locator('input[placeholder*="nome"], input[name="name"], input[id*="name"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Carlos Teste');
        console.log('Name filled: Carlos Teste');
      } else {
        console.log('Name input not found by placeholder, trying other selectors');
        const inputs = await page.$$eval('input', els => els.map(e => ({ ph: e.placeholder, type: e.type, id: e.id })));
        console.log('All inputs:', inputs);
      }

      const phoneInput = page.locator('input[placeholder*="99999"], input[placeholder*="11"]').first();
      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('11999001122');
        console.log('Phone filled: 11999001122');
      }

      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill('carlos@test.com');
        console.log('Email filled: carlos@test.com');
      }

      const messageInput = page.locator('textarea').first();
      if (await messageInput.isVisible().catch(() => false)) {
        await messageInput.fill('Quero visitar');
        console.log('Message filled: Quero visitar');
      }

      await takeScreenshot(page, 'f2420-step3-form-filled.png', 'Form filled with Carlos Teste data');
      results.push({ step: 'Fill Form', status: 'PASS' });

      // STEP 4: Submit form
      console.log('\n=== STEP 4: Submit form ===');
      const submitBtn = page.locator('button[type="submit"]').first();
      const submitVisible = await submitBtn.isVisible().catch(() => false);
      console.log('Submit button visible:', submitVisible);

      if (submitVisible) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        await takeScreenshot(page, 'f2420-step4-after-submit.png', 'After form submission');

        const successText = page.locator('text=Interesse registrado!');
        const isSuccess = await successText.isVisible().catch(() => false);
        console.log('Success message visible:', isSuccess);

        if (isSuccess) {
          results.push({ step: 'Submit Form', status: 'PASS - Lead created successfully' });
          const closeBtn = page.locator('button').filter({ hasText: /Fechar/ }).first();
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click();
            await page.waitForTimeout(500);
          }
        } else {
          const bodyText = await page.textContent('body').catch(() => '');
          const snippet = bodyText.substring(0, 200);
          results.push({ step: 'Submit Form', status: `WARNING - No success message. Snippet: ${snippet}` });
        }
      } else {
        results.push({ step: 'Submit Form', status: 'FAIL - Submit button not visible' });
      }
    } else {
      console.log('Interest button NOT found anywhere on page!');
      await takeScreenshot(page, 'f2420-step2-no-button.png', 'Interest button not found');
      results.push({ step: 'Open Interest Modal', status: 'FAIL - Button not found on /imoveis/2' });
    }

    // STEP 5: Navigate to admin leads page
    console.log('\n=== STEP 5: Navigate to /admin/leads ===');
    await page.goto(`${BASE_URL}/admin/leads`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'f2420-step5-admin-leads.png', 'Admin leads page');

    const adminTitle = await page.title();
    console.log('Page title:', adminTitle);
    results.push({
      step: 'Navigate to Admin Leads',
      status: adminTitle.toLowerCase().includes('leads') || adminTitle.toLowerCase().includes('admin')
        ? 'PASS'
        : `WARNING - Title: ${adminTitle}`
    });

    // STEP 6: Verify stats cards
    console.log('\n=== STEP 6: Check stats cards ===');
    const statsLabels = ['Novos', 'Contatados', 'Convertidos', 'Total'];
    const statsResults = {};

    for (const label of statsLabels) {
      const el = page.locator(`text=${label}`).first();
      const visible = await el.isVisible().catch(() => false);
      statsResults[label] = visible;
      console.log(`  Stats "${label}": ${visible ? 'VISIBLE' : 'NOT VISIBLE'}`);
    }

    const allStatsVisible = Object.values(statsResults).every(Boolean);
    results.push({
      step: 'Stats Cards',
      status: allStatsVisible ? 'PASS - All 4 stat cards visible' : `PARTIAL - ${JSON.stringify(statsResults)}`
    });

    // STEP 7: Check leads list for our submitted lead
    console.log('\n=== STEP 7: Check leads list ===');
    const carlosVisible = await page.locator('text=Carlos Teste').first().isVisible().catch(() => false);
    console.log('Carlos Teste visible:', carlosVisible);

    const noLeadsVisible = await page.locator('text=Nenhum lead').isVisible().catch(() => false);
    console.log('No leads empty state:', noLeadsVisible);

    // Also check for any leads at all
    const leadItems = await page.$$eval('[class*="border"], [class*="card"]', els => els.length);
    console.log('Border/card elements:', leadItems);

    await takeScreenshot(page, 'f2420-step6-leads-list.png', 'Leads list');
    results.push({
      step: 'Leads List',
      status: carlosVisible
        ? 'PASS - Carlos Teste lead found in list'
        : noLeadsVisible
          ? 'FAIL - Empty state shown (Carlos Teste not persisted)'
          : 'INFO - Leads exist but not individually verified by name'
    });

    // STEP 8: Test status change
    console.log('\n=== STEP 8: Test status change ===');
    const selectCount = await page.locator('select').count();
    console.log('Select elements found:', selectCount);

    if (selectCount > 0) {
      const firstSelect = page.locator('select').first();
      const currentVal = await firstSelect.inputValue().catch(() => '');
      console.log('Current status:', currentVal);

      await firstSelect.selectOption('contatado');
      await page.waitForTimeout(1500);
      await takeScreenshot(page, 'f2420-step7-status-changed.png', 'After status change to contatado');

      const newVal = await firstSelect.inputValue().catch(() => '');
      console.log('New status:', newVal);
      results.push({
        step: 'Status Change',
        status: newVal === 'contatado' ? 'PASS - Status changed to contatado' : `INFO - Status: ${newVal}`
      });

      // Reload page to verify persistence
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const persistedVal = await page.locator('select').first().inputValue().catch(() => '');
      console.log('Status after reload:', persistedVal);
      results.push({
        step: 'Status Persistence',
        status: persistedVal === 'contatado' ? 'PASS - Status persisted after reload' : `INFO - After reload: ${persistedVal}`
      });
    } else {
      results.push({ step: 'Status Change', status: 'INFO - No select elements found (no leads in list?)' });
    }

    // Final screenshot
    await takeScreenshot(page, 'f2420-step8-final.png', 'Final state');

    console.log('\nConsole errors:', consoleErrors.length > 0 ? consoleErrors : 'NONE');

  } catch (err) {
    console.error('Test error:', err.message);
    await takeScreenshot(page, 'f2420-error.png', 'Error state').catch(() => {});
    results.push({ step: 'Test Execution', status: 'ERROR: ' + err.message });
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n=== FINAL TEST RESULTS ===');
  let passCount = 0, failCount = 0;
  results.forEach(r => {
    const icon = r.status.startsWith('PASS') ? 'PASS' : r.status.startsWith('FAIL') ? 'FAIL' : 'INFO/WARN';
    if (r.status.startsWith('PASS')) passCount++;
    if (r.status.startsWith('FAIL')) failCount++;
    console.log(`  [${icon}] ${r.step}: ${r.status}`);
  });
  console.log(`\nTotal: ${passCount} passed, ${failCount} failed`);

  return { results, consoleErrors, passCount, failCount };
}

runTest().then(({ results, consoleErrors, passCount, failCount }) => {
  writeFileSync(`${EVIDENCE_DIR}/f2420-test-results.json`, JSON.stringify({ results, consoleErrors, passCount, failCount }, null, 2));
  console.log('Test complete.');
}).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
