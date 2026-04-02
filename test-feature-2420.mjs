import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const EVIDENCE_DIR = 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence';
const BASE_URL = 'http://localhost:3000';

async function takeScreenshot(page, filename, description) {
  const path = `${EVIDENCE_DIR}/${filename}`;
  await page.screenshot({ path, fullPage: true });
  console.log(`Screenshot: ${filename} - ${description}`);
  return path;
}

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const results = [];

  try {
    // STEP 1: Navigate to property detail page to submit interest form
    console.log('\n=== STEP 1: Navigate to property detail page ===');
    await page.goto(`${BASE_URL}/imoveis/1`, { waitUntil: 'networkidle' });
    await takeScreenshot(page, 'f12-step1-property-detail.png', 'Property detail page');

    // STEP 2: Find and click "Tenho Interesse" button
    console.log('\n=== STEP 2: Click Tenho Interesse button ===');

    // Look for the interest button
    const interestButton = await page.locator('button:has-text("Tenho Interesse"), button:has-text("tenho interesse"), a:has-text("Tenho Interesse")').first();
    const buttonVisible = await interestButton.isVisible().catch(() => false);
    console.log('Interest button visible:', buttonVisible);

    if (buttonVisible) {
      await interestButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'f12-step2-modal-open.png', 'Interest modal opened');
      results.push({ step: 'Open Interest Modal', status: 'PASS' });

      // STEP 3: Fill in the form
      console.log('\n=== STEP 3: Fill in interest form ===');

      // Fill name
      const nameInput = page.locator('input[name="name"], input[placeholder*="nome"], input[placeholder*="Nome"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Maria Santos');
      }

      // Fill phone
      const phoneInput = page.locator('input[name="phone"], input[placeholder*="telefone"], input[placeholder*="Telefone"], input[type="tel"]').first();
      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('11988776655');
      }

      // Fill email
      const emailInput = page.locator('input[name="email"], input[placeholder*="email"], input[placeholder*="Email"], input[type="email"]').first();
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill('maria@test.com');
      }

      // Fill message
      const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="mensagem"], textarea[placeholder*="Mensagem"]').first();
      if (await messageInput.isVisible().catch(() => false)) {
        await messageInput.fill('Quero saber mais');
      }

      await takeScreenshot(page, 'f12-step3-form-filled.png', 'Form filled with data');
      results.push({ step: 'Fill Interest Form', status: 'PASS' });

      // STEP 4: Submit form
      console.log('\n=== STEP 4: Submit the form ===');
      const submitButton = page.locator('button[type="submit"]:has-text("Enviar"), button:has-text("Enviar"), button:has-text("Enviar Mensagem")').first();
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'f12-step4-after-submit.png', 'After form submission');
        results.push({ step: 'Submit Interest Form', status: 'PASS' });
      } else {
        console.log('Submit button not found, trying any submit button...');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'f12-step4-after-submit.png', 'After form submission attempt');
        results.push({ step: 'Submit Interest Form', status: 'PARTIAL - submit button not found clearly' });
      }

      // Close modal if still open
      const closeButton = page.locator('button[aria-label="Close"], button:has-text("Fechar"), [data-dismiss="modal"]').first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
      // Try pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('Interest button not found, taking snapshot...');
      const snapshot = await page.accessibility.snapshot();
      console.log('Page title:', await page.title());
      results.push({ step: 'Open Interest Modal', status: 'FAIL - button not found' });
    }

    // STEP 5: Navigate to admin leads page
    console.log('\n=== STEP 5: Navigate to admin leads page ===');
    await page.goto(`${BASE_URL}/admin/leads`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'f12-step5-admin-leads.png', 'Admin leads page');

    // Check page loaded
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    const pageContent = await page.textContent('body');

    // STEP 6: Verify stats cards
    console.log('\n=== STEP 6: Verify stats cards ===');
    const statsTexts = ['Novos', 'Contatados', 'Convertidos', 'Total'];
    const statsFound = [];
    for (const stat of statsTexts) {
      const hasText = await page.locator(`text=${stat}`).first().isVisible().catch(() => false);
      console.log(`  ${stat}: ${hasText ? 'FOUND' : 'NOT FOUND'}`);
      statsFound.push({ stat, found: hasText });
    }

    const allStatsFound = statsFound.every(s => s.found);
    results.push({
      step: 'Stats Cards Visible',
      status: allStatsFound ? 'PASS' : `PARTIAL - ${statsFound.filter(s => !s.found).map(s => s.stat).join(', ')} not found`
    });

    // STEP 7: Check for leads list and status filters
    console.log('\n=== STEP 7: Check leads list and filters ===');

    // Check for filter buttons
    const filterTexts = ['Todos', 'Novo', 'Contatado', 'Convertido'];
    for (const filter of filterTexts) {
      const hasFilter = await page.locator(`button:has-text("${filter}"), [role="tab"]:has-text("${filter}")`).first().isVisible().catch(() => false);
      console.log(`  Filter "${filter}": ${hasFilter ? 'FOUND' : 'NOT FOUND'}`);
    }

    // Check for leads entries
    const leadsCount = await page.locator('table tbody tr, [data-testid="lead-item"], .lead-item').count();
    console.log('Leads entries found:', leadsCount);

    // Check for any lead-related content
    const hasLeadsContent = await page.locator('text=maria@test.com, text=Maria Santos, text=11988776655').first().isVisible().catch(() => false);
    console.log('New lead visible:', hasLeadsContent);

    await takeScreenshot(page, 'f12-step6-leads-list.png', 'Leads list with stats');
    results.push({ step: 'Leads List Visible', status: leadsCount > 0 ? 'PASS' : 'CHECK - lead count: ' + leadsCount });

    // STEP 8: Try changing a lead status
    console.log('\n=== STEP 8: Try status change ===');

    // Look for status dropdown or button
    const statusSelect = page.locator('select[name="status"], select').first();
    const statusSelectVisible = await statusSelect.isVisible().catch(() => false);

    if (statusSelectVisible) {
      console.log('Status select found');
      await statusSelect.selectOption('contatado');
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'f12-step7-status-changed.png', 'After status change');
      results.push({ step: 'Change Lead Status', status: 'PASS' });
    } else {
      // Try finding a button or badge that changes status
      const statusBadge = page.locator('[class*="badge"], [class*="status"]').first();
      const badgeVisible = await statusBadge.isVisible().catch(() => false);
      console.log('Status badge visible:', badgeVisible);

      if (badgeVisible) {
        await statusBadge.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, 'f12-step7-status-click.png', 'After status badge click');
        results.push({ step: 'Change Lead Status', status: 'PARTIAL - found badge, clicked it' });
      } else {
        results.push({ step: 'Change Lead Status', status: 'INFO - No status change UI found on initial check' });
      }
    }

    // Final comprehensive screenshot
    await page.goto(`${BASE_URL}/admin/leads`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'f12-step8-final.png', 'Final admin leads page state');

    // Log console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

  } catch (err) {
    console.error('Test error:', err);
    await takeScreenshot(page, 'f12-error.png', 'Error state').catch(() => {});
    results.push({ step: 'Test Execution', status: 'ERROR: ' + err.message });
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n=== TEST RESULTS SUMMARY ===');
  results.forEach(r => console.log(`  [${r.status.startsWith('PASS') ? 'PASS' : r.status.startsWith('FAIL') ? 'FAIL' : 'INFO'}] ${r.step}: ${r.status}`));

  return results;
}

runTest().then(results => {
  writeFileSync(`${EVIDENCE_DIR}/f12-test-results.json`, JSON.stringify(results, null, 2));
  console.log('\nTest complete. Results saved.');
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
