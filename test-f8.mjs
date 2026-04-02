import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto('http://localhost:3000/admin/novo');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-1-admin-novo.png' });
  console.log('Step 1: Navigated to admin/novo');
  
  const title = await page.title();
  const h1Text = await page.locator('h1').first().textContent().catch(() => 'no h1');
  console.log(`Title: ${title}, H1: ${h1Text}`);
  
  const inputs = await page.locator('input').count();
  console.log(`Found ${inputs} input fields`);
  
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-2-form-overview.png', fullPage: true });
  console.log('Step 2: Full page screenshot taken');
  
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await browser.close();
}
