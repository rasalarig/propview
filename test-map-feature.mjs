import { chromium } from 'playwright';
import path from 'path';

const EVIDENCE_DIR = 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence';
const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const results = [];

  // TEST 1: Map on property detail page (id=2)
  console.log('\n=== TEST 1: Map on property detail page ===');
  try {
    await page.goto(`${BASE_URL}/imoveis/2`, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(3000); // Allow Leaflet to load

    // Scroll to the Localização section
    await page.evaluate(() => {
      const headings = document.querySelectorAll('h2, h3');
      for (const h of headings) {
        if (h.textContent && h.textContent.includes('Localiza')) {
          h.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    });
    await sleep(2000);

    // Check for Leaflet map
    const mapContainer = await page.$('.leaflet-container');
    const hasMap = mapContainer !== null;

    // Check for marker
    const marker = await page.$('.leaflet-marker-icon');
    const hasMarker = marker !== null;

    // Check for old placeholder
    const placeholder = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('Mapa em breve');
    });

    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test1-detail-page.png`, fullPage: false });

    const passed = hasMap && hasMarker && !placeholder;
    results.push({
      test: 'Test 1: Map on property detail page (id=2)',
      passed,
      details: { hasMap, hasMarker, noPlaceholder: !placeholder }
    });
    console.log(`Map present: ${hasMap}, Marker present: ${hasMarker}, No placeholder: ${!placeholder}`);
  } catch (err) {
    console.error('Test 1 error:', err.message);
    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test1-error.png` });
    results.push({ test: 'Test 1: Map on property detail page (id=2)', passed: false, error: err.message });
  }

  // TEST 2: Map on second property (id=3)
  console.log('\n=== TEST 2: Map on second property (id=3, Piedade) ===');
  try {
    await page.goto(`${BASE_URL}/imoveis/3`, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(3000);

    await page.evaluate(() => {
      const headings = document.querySelectorAll('h2, h3');
      for (const h of headings) {
        if (h.textContent && h.textContent.includes('Localiza')) {
          h.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    });
    await sleep(2000);

    const mapContainer = await page.$('.leaflet-container');
    const hasMap = mapContainer !== null;
    const marker = await page.$('.leaflet-marker-icon');
    const hasMarker = marker !== null;

    // Verify title shows Piedade
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const isPiedade = bodyText.includes('Piedade');

    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test2-piedade.png`, fullPage: false });

    const passed = hasMap && hasMarker && isPiedade;
    results.push({
      test: 'Test 2: Map on property detail page (id=3, Piedade)',
      passed,
      details: { hasMap, hasMarker, isPiedade }
    });
    console.log(`Map present: ${hasMap}, Marker present: ${hasMarker}, Is Piedade: ${isPiedade}`);
  } catch (err) {
    console.error('Test 2 error:', err.message);
    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test2-error.png` });
    results.push({ test: 'Test 2: Map on property detail page (id=3, Piedade)', passed: false, error: err.message });
  }

  // TEST 3: Map picker in admin form
  console.log('\n=== TEST 3: Map picker in admin form ===');
  try {
    await page.goto(`${BASE_URL}/admin/novo`, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(3000);

    // Scroll down to find map picker
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await sleep(1500);

    const mapContainer = await page.$('.leaflet-container');
    const hasMap = mapContainer !== null;

    // Check for lat/lng inputs
    const latInput = await page.$('input[placeholder="-23.5920"]');
    const lngInput = await page.$('input[placeholder="-48.0530"]');
    const hasInputs = latInput !== null && lngInput !== null;

    // Check for "Clique no mapa" instruction text
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasInstruction = bodyText.includes('Clique no mapa') || bodyText.includes('clique no mapa');

    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test3-admin-form.png`, fullPage: false });

    // Try clicking the map to set coordinates
    if (mapContainer) {
      const mapBounds = await mapContainer.boundingBox();
      if (mapBounds) {
        const clickX = mapBounds.x + mapBounds.width / 2;
        const clickY = mapBounds.y + mapBounds.height / 2;
        await page.mouse.click(clickX, clickY);
        await sleep(1000);
      }
    }

    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test3-after-click.png`, fullPage: false });

    // Check if inputs were updated after click
    const latValue = latInput ? await latInput.inputValue() : '';
    const lngValue = lngInput ? await lngInput.inputValue() : '';
    const coordsUpdated = latValue !== '' && lngValue !== '';

    console.log(`Map: ${hasMap}, Inputs: ${hasInputs}, Instruction: ${hasInstruction}, Coords after click: lat=${latValue}, lng=${lngValue}`);

    const passed = hasMap && hasInputs;
    results.push({
      test: 'Test 3: Map picker in admin form',
      passed,
      details: { hasMap, hasInputs, hasInstruction, coordsUpdated, latValue, lngValue }
    });
  } catch (err) {
    console.error('Test 3 error:', err.message);
    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test3-error.png` });
    results.push({ test: 'Test 3: Map picker in admin form', passed: false, error: err.message });
  }

  // TEST 4: Create property with coordinates and verify on detail page
  console.log('\n=== TEST 4: Create property with coordinates ===');
  try {
    await page.goto(`${BASE_URL}/admin/novo`, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(2000);

    // Fill form fields
    const titleInput = await page.$('input[name="title"], input[placeholder*="Título"], input[placeholder*="titulo"]');
    if (titleInput) {
      await titleInput.fill('Terreno Teste Mapa');
    } else {
      // Try by label or other means
      const inputs = await page.$$('input[type="text"]');
      if (inputs.length > 0) await inputs[0].fill('Terreno Teste Mapa');
    }

    // Fill price
    const priceInput = await page.$('input[name="price"], input[placeholder*="150"], input[placeholder*="Preço"], input[placeholder*="preco"]');
    if (priceInput) {
      await priceInput.fill('150000');
    }

    // Fill area
    const areaInput = await page.$('input[name="area"], input[placeholder*="m²"]');
    if (areaInput) {
      await areaInput.fill('200');
    }

    // Fill address
    const addressInput = await page.$('input[name="address"], input[placeholder*="endereço"], input[placeholder*="Endereço"]');
    if (addressInput) {
      await addressInput.fill('Rua Teste, 123');
    }

    // Fill city
    const cityInput = await page.$('input[name="city"], input[placeholder*="Cidade"], input[placeholder*="cidade"]');
    if (cityInput) {
      await cityInput.fill('Sorocaba');
    }

    // Take screenshot of partially filled form
    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test4-form-partial.png`, fullPage: false });

    // Scroll to find lat/lng inputs
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1000);

    // Set lat/lng manually
    const latInput = await page.$('input[placeholder="-23.5920"]');
    const lngInput = await page.$('input[placeholder="-48.0530"]');

    if (latInput && lngInput) {
      await latInput.fill('-23.55');
      await lngInput.fill('-47.45');
      console.log('Set lat/lng manually');
    } else {
      // Try clicking on the map
      const mapContainer = await page.$('.leaflet-container');
      if (mapContainer) {
        const mapBounds = await mapContainer.boundingBox();
        if (mapBounds) {
          await page.mouse.click(mapBounds.x + mapBounds.width * 0.4, mapBounds.y + mapBounds.height * 0.4);
          await sleep(1000);
          console.log('Clicked on map to set coordinates');
        }
      }
    }

    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test4-coords-set.png`, fullPage: false });

    // Now scroll back to top to fill remaining required fields and submit
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);

    // Get all form inputs and check what's filled
    const formData = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const inputs = form.querySelectorAll('input, textarea, select');
      const data = {};
      inputs.forEach(inp => {
        data[inp.name || inp.placeholder || inp.type] = inp.value;
      });
      return data;
    });
    console.log('Form data:', JSON.stringify(formData));

    // Try submitting the form
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(3000);
    }

    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test4-after-submit.png`, fullPage: false });

    // Check current URL after submit
    const currentUrl = page.url();
    console.log('After submit URL:', currentUrl);

    // Navigate to imoveis list to find the new property
    await page.goto(`${BASE_URL}/imoveis`, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(2000);

    // Find the new property
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasNewProperty = bodyText.includes('Terreno Teste Mapa');

    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test4-imoveis-list.png`, fullPage: false });

    // If property was created, navigate to its detail page
    let mapOnDetail = false;
    if (hasNewProperty) {
      // Click on it
      const link = await page.$('a[href*="imoveis/"]');
      const allLinks = await page.$$('a[href*="/imoveis/"]');

      // Find the newest property link
      for (const link of allLinks) {
        const text = await link.textContent();
        if (text && text.includes('Terreno Teste Mapa')) {
          await link.click();
          break;
        }
      }

      // If no direct click, find via cards
      const cards = await page.$$('.cursor-pointer, [href*="imoveis"]');
      for (const card of cards) {
        const text = await card.textContent();
        if (text && text.includes('Terreno Teste Mapa')) {
          await card.click();
          break;
        }
      }

      await sleep(3000);
      const mapCheck = await page.$('.leaflet-container');
      mapOnDetail = mapCheck !== null;

      await page.screenshot({ path: `${EVIDENCE_DIR}/map-test4-new-detail.png`, fullPage: false });
    }

    const passed = hasNewProperty;
    results.push({
      test: 'Test 4: Create property with coordinates',
      passed,
      details: { currentUrl, hasNewProperty, mapOnDetail }
    });
    console.log(`New property created: ${hasNewProperty}, Map on detail: ${mapOnDetail}`);
  } catch (err) {
    console.error('Test 4 error:', err.message);
    await page.screenshot({ path: `${EVIDENCE_DIR}/map-test4-error.png` });
    results.push({ test: 'Test 4: Create property with coordinates', passed: false, error: err.message });
  }

  await browser.close();

  // Summary
  console.log('\n=== TEST SUMMARY ===');
  let passCount = 0;
  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    console.log(`${status}: ${r.test}`);
    if (r.details) console.log('  Details:', JSON.stringify(r.details));
    if (r.error) console.log('  Error:', r.error);
    if (r.passed) passCount++;
  }
  console.log(`\nTotal: ${passCount}/${results.length} tests passed`);

  return results;
}

runTests().catch(console.error);
