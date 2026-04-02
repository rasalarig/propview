import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Create a test PNG image
function createTestPNG() {
  // Minimal valid PNG: 1x1 green pixel
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG signature
  // IHDR chunk
  const ihdrData = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]);
  const ihdrCRC = Buffer.from([0x90, 0x77, 0x53, 0xDE]);
  const ihdrLen = Buffer.from([0x00, 0x00, 0x00, 0x0D]);
  const ihdrType = Buffer.from([0x49, 0x48, 0x44, 0x52]);
  // IDAT chunk (compressed 1x1 green pixel)
  const idatLen = Buffer.from([0x00, 0x00, 0x00, 0x0C]);
  const idatType = Buffer.from([0x49, 0x44, 0x41, 0x54]);
  const idatData = Buffer.from([0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]);
  const idatCRC = Buffer.from([0xE2, 0x21, 0xBC, 0x33]);
  // IEND chunk
  const iendLen = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const iendType = Buffer.from([0x49, 0x45, 0x4E, 0x44]);
  const iendCRC = Buffer.from([0xAE, 0x42, 0x60, 0x82]);
  
  return Buffer.concat([header, ihdrLen, ihdrType, ihdrData, ihdrCRC, idatLen, idatType, idatData, idatCRC, iendLen, iendType, iendCRC]);
}

const testImagePath = 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/test-upload.png';
fs.writeFileSync(testImagePath, createTestPNG());
console.log('Test image created at:', testImagePath);

try {
  // STEP 1: Navigate to admin/cadastro
  await page.goto('http://localhost:3000/admin/cadastro');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-2-form.png', fullPage: true });
  console.log('Step 1: Form loaded');

  // STEP 2: Fill in basic form data
  await page.fill('input[placeholder*="Terreno"]', 'Casa Teste Upload Playwright');
  await page.fill('textarea', 'Terreno com arvores frutiferas em local tranquilo. Bom acesso, documentacao ok.');
  
  // Price
  await page.fill('input[type="number"][placeholder="180000"]', '250000');
  // Area
  await page.fill('input[type="number"][placeholder="300"]', '350');
  
  // Address
  await page.fill('input[placeholder="Rua das Palmeiras, Lote 15"]', 'Rua Teste, 42');
  // City
  await page.fill('input[placeholder="Itapetininga"]', 'Itapetininga');
  // State
  await page.fill('input[placeholder="SP"]', 'SP');
  // Neighborhood
  await page.fill('input[placeholder="Jardim Europa"]', 'Jardim Teste');
  
  console.log('Step 2: Basic form filled');
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-3-form-filled.png', fullPage: true });

  // STEP 3: Upload an image via file input
  const fileInput = await page.locator('input[type="file"]#image-upload');
  await fileInput.setInputFiles(testImagePath);
  
  // Wait for preview to appear
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-4-image-preview.png', fullPage: true });
  
  const previews = await page.locator('img[src^="data:image"]').count();
  console.log(`Step 3: Image uploaded. Previews shown: ${previews}`);
  
  // STEP 4: Submit the form
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-5-after-submit.png', fullPage: true });
  
  const successMsg = await page.locator('text=sucesso').count();
  console.log(`Step 4: After submit. Success message count: ${successMsg}`);
  
  const currentUrl = page.url();
  console.log('Current URL after submit:', currentUrl);
  
  // Wait for redirect
  await page.waitForTimeout(2000);
  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);
  
} catch (err) {
  console.error('Error:', err.message);
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-error.png', fullPage: true });
} finally {
  await browser.close();
}
