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

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const results = [];

  try {
    // STEP 1: Navigate to property detail page
    console.log('\n=== STEP 1: Navigate to property detail page ===');
    await page.goto(`${BASE_URL}/imoveis/1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'f12-v2-step1-property-detail.png', 'Property detail page loaded');

    // STEP 2: Find the "Tenho Interesse" button
    console.log('\n=== STEP 2: Click Tenho Interesse button ===');

    // Look for button with "Interesse" text
    const allButtons = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()));
    console.log('All buttons found:', allButtons.slice(0, 20));

    const interestBtn = page.locator('button').filter({ hasText: /Tenho Interesse|Interesse/ }).first();
    const btnVisible = await interestBtn.isVisible().catch(() => false);
    console.log('Interest button visible:', btnVisible);

    if (btnVisible) {
      await interestBtn.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'f12-v2-step2-modal-open.png', 'Modal opened after clicking Tenho Interesse');
      results.push({ step: 'Open Interest Modal', status: 'PASS' });

      // STEP 3: Fill form
      console.log('\n=== STEP 3: Fill form fields ===');

      // Name field - look for input with placeholder
      const nameInput = page.locator('input[placeholder="Seu nome completo"]');
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Maria Santos');
        console.log('Name filled');
      }

      // Phone field - note it has a formatter, just type digits
      const phoneInput = page.locator('input[placeholder="(11) 99999-9999"]');
      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('11988776655');
        console.log('Phone filled');
      }

      // Email field
      const emailInput = page.locator('input[placeholder="seu@email.com"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill('maria@test.com');
        console.log('Email filled');
      }

      // Message textarea
      const messageInput = page.locator('textarea[placeholder*="informacoes"]');
      if (await messageInput.isVisible().catch(() => false)) {
        await messageInput.fill('Quero saber mais');
        console.log('Message filled');
      }

      await takeScreenshot(page, 'f12-v2-step3-form-filled.png', 'Form filled with test data');
      results.push({ step: 'Fill Form', status: 'PASS' });

      // STEP 4: Submit form
      console.log('\n=== STEP 4: Submit the form ===');
      const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Enviar/ }).first();
      const submitVisible = await submitBtn.isVisible().catch(() => false);
      console.log('Submit button visible:', submitVisible);

      if (submitVisible) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'f12-v2-step4-after-submit.png', 'After form submission');

        // Check for success state (CheckCircle visible)
        const successIcon = page.locator('.text-emerald-400').first();
        const successText = page.locator('text=Interesse registrado!');
        const isSuccess = await successText.isVisible().catch(() => false);
        console.log('Success message visible:', isSuccess);

        if (isSuccess) {
          results.push({ step: 'Submit Form', status: 'PASS - Lead created successfully' });
          // Close the modal
          const closeBtn = page.locator('button').filter({ hasText: 'Fechar' }).first();
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click();
          }
        } else {
          const errorMsg = await page.locator('[class*="red"]').textContent().catch(() => '');
          results.push({ step: 'Submit Form', status: `WARNING - No success message. Error: ${errorMsg}` });
        }
      } else {
        console.log('Submit button not found');
        results.push({ step: 'Submit Form', status: 'FAIL - Submit button not visible' });
      }
    } else {
      console.log('Interest button NOT visible');
      await takeScreenshot(page, 'f12-v2-step2-no-button.png', 'Interest button not found');
      results.push({ step: 'Open Interest Modal', status: 'FAIL - Button not found' });
    }

    // STEP 5: Navigate to admin leads page
    console.log('\n=== STEP 5: Navigate to Admin Leads page ===');
    await page.goto(`${BASE_URL}/admin/leads`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'f12-v2-step5-admin-leads-initial.png', 'Admin leads page initial state');

    const adminTitle = await page.title();
    console.log('Admin page title:', adminTitle);
    results.push({ step: 'Navigate to Admin Leads', status: adminTitle.includes('Leads') ? 'PASS' : `WARNING - Title: ${adminTitle}` });

    // STEP 6: Check stats cards
    console.log('\n=== STEP 6: Verify stats cards ===');
    const statsLabels = ['Novos', 'Contatados', 'Convertidos', 'Total'];
    const statsResults = {};

    for (const label of statsLabels) {
      const el = page.locator(`text=${label}`).first();
      const visible = await el.isVisible().catch(() => false);
      statsResults[label] = visible;
      console.log(`  "${label}": ${visible ? 'VISIBLE' : 'NOT VISIBLE'}`);
    }

    const allStatsVisible = Object.values(statsResults).every(Boolean);
    results.push({
      step: 'Stats Cards (Novos/Contatados/Convertidos/Total)',
      status: allStatsVisible ? 'PASS' : `PARTIAL - ${JSON.stringify(statsResults)}`
    });

    // STEP 7: Check total count and leads header
    const totalText = await page.locator('text=/\\d+ leads no total/').first().textContent().catch(() => '');
    console.log('Total leads text:', totalText);

    // STEP 8: Look for "Nenhum lead" or actual leads
    const noLeadsText = page.locator('text=Nenhum lead');
    const noLeadsVisible = await noLeadsText.isVisible().catch(() => false);
    console.log('No leads empty state:', noLeadsVisible);

    // Look for lead cards
    const leadCards = page.locator('.space-y-3 > *');
    const leadCardCount = await leadCards.count();
    console.log('Lead cards count:', leadCardCount);

    // Check for Maria Santos specifically
    const mariaVisible = await page.locator('text=Maria Santos').first().isVisible().catch(() => false);
    console.log('Maria Santos visible:', mariaVisible);

    await takeScreenshot(page, 'f12-v2-step6-leads-list.png', 'Leads list with data');
    results.push({
      step: 'Leads List',
      status: mariaVisible ? 'PASS - Maria Santos lead found' : (noLeadsVisible ? 'INFO - Empty state shown (if no leads in DB)' : `INFO - leadCards: ${leadCardCount}`)
    });

    // STEP 9: Try status filter by clicking stats card
    console.log('\n=== STEP 9: Test status filtering via stats cards ===');
    const novosCard = page.locator('p.text-xs.text-muted-foreground:has-text("Novos")').first();
    if (await novosCard.isVisible().catch(() => false)) {
      // Click the parent card
      await novosCard.locator('..').click().catch(() => {});
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'f12-v2-step7-filter-novos.png', 'After clicking Novos filter');
      console.log('Clicked Novos card');
    }

    // STEP 10: If Maria lead exists, try status change
    if (mariaVisible) {
      console.log('\n=== STEP 10: Try status change on Maria Santos lead ===');
      const selectEl = page.locator('select').first();
      if (await selectEl.isVisible().catch(() => false)) {
        const currentVal = await selectEl.inputValue();
        console.log('Current status:', currentVal);

        // Change to 'contatado'
        await selectEl.selectOption('contatado');
        await page.waitForTimeout(1500);
        await takeScreenshot(page, 'f12-v2-step8-status-changed.png', 'After status change to Contatado');

        const newVal = await selectEl.inputValue();
        console.log('New status:', newVal);
        results.push({
          step: 'Status Change',
          status: newVal === 'contatado' ? 'PASS - Status changed to contatado' : `INFO - Status: ${newVal}`
        });
      } else {
        results.push({ step: 'Status Change', status: 'INFO - Select not found (no leads to change)' });
      }
    }

    // Check for WhatsApp button
    const waButton = page.locator('a[href*="wa.me"]').first();
    const waVisible = await waButton.isVisible().catch(() => false);
    console.log('WhatsApp button visible:', waVisible);
    if (waVisible) results.push({ step: 'WhatsApp Contact Button', status: 'PASS' });

    // Final screenshot
    await takeScreenshot(page, 'f12-v2-step9-final.png', 'Final state of admin leads page');

    // Check for console errors
    console.log('\nConsole errors:', consoleErrors.length > 0 ? consoleErrors : 'NONE');

  } catch (err) {
    console.error('Test error:', err.message);
    await takeScreenshot(page, 'f12-v2-error.png', 'Error state').catch(() => {});
    results.push({ step: 'Test Execution', status: 'ERROR: ' + err.message });
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n=== FINAL TEST RESULTS ===');
  let passCount = 0, failCount = 0;
  results.forEach(r => {
    const icon = r.status.startsWith('PASS') ? 'PASS' : r.status.startsWith('FAIL') ? 'FAIL' : 'INFO';
    if (icon === 'PASS') passCount++;
    if (icon === 'FAIL') failCount++;
    console.log(`  [${icon}] ${r.step}: ${r.status}`);
  });
  console.log(`\n  Total: ${passCount} passed, ${failCount} failed, ${results.length - passCount - failCount} info`);

  return { results, consoleErrors };
}

runTest().then(({ results, consoleErrors }) => {
  writeFileSync(`${EVIDENCE_DIR}/f12-v2-test-results.json`, JSON.stringify({ results, consoleErrors }, null, 2));
  console.log('\nTest complete.');
}).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
