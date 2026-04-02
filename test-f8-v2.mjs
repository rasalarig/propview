import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  // Navigate to admin/cadastro (not /admin/novo)
  await page.goto('http://localhost:3000/admin/cadastro');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-1-admin-cadastro.png', fullPage: true });
  console.log('Step 1: Navigated to admin/cadastro');
  
  const title = await page.title();
  const h1Text = await page.locator('h1').first().textContent().catch(() => 'no h1');
  console.log(`Title: ${title}, H1: ${h1Text}`);
  
  const inputs = await page.locator('input').count();
  console.log(`Found ${inputs} input fields`);
  
  // Check for file input
  const fileInputs = await page.locator('input[type="file"]').count();
  console.log(`File inputs: ${fileInputs}`);
  
  // Check page content
  const pageText = await page.locator('body').textContent();
  console.log(`Page contains 'imagem' or 'foto': ${pageText.toLowerCase().includes('imagem') || pageText.toLowerCase().includes('foto')}`);
  console.log(`Page contains 'upload': ${pageText.toLowerCase().includes('upload')}`);
  
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await browser.close();
}
