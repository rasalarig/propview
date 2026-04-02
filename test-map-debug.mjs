import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const EVIDENCE_DIR = 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Capture console messages
  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleMsgs.push(`[ERROR] ${err.message}`));

  console.log('Navigating to /imoveis/2...');
  await page.goto(`${BASE_URL}/imoveis/2`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(5000); // Give Leaflet more time to initialize

  // Take screenshot
  await page.screenshot({ path: `${EVIDENCE_DIR}/map-debug-detail.png`, fullPage: true });
  console.log('Screenshot saved: map-debug-detail.png');

  // Check what's in the DOM
  const html = await page.evaluate(() => {
    const locSection = document.querySelector('[class*="locali"]') ||
      Array.from(document.querySelectorAll('*')).find(el => el.textContent === 'Localização');

    // Find all div descendants with class info
    const all = document.querySelectorAll('div[class]');
    const relevant = [];
    all.forEach(d => {
      if (d.className && (d.className.includes('leaflet') || d.className.includes('map') || d.className.includes('Map'))) {
        relevant.push({ tag: d.tagName, class: d.className, id: d.id });
      }
    });
    return { relevant, bodyLength: document.body.innerHTML.length };
  });
  console.log('Leaflet-related elements:', JSON.stringify(html.relevant));
  console.log('Body HTML length:', html.bodyLength);

  // Check for map-related content in the page HTML
  const pageContent = await page.content();
  const hasLeaflet = pageContent.includes('leaflet');
  const hasMapContainer = pageContent.includes('MapContainer');
  const hasMapDiv = pageContent.includes('leaflet-container');
  console.log('Page has "leaflet":', hasLeaflet);
  console.log('Page has "MapContainer":', hasMapContainer);
  console.log('Page has "leaflet-container":', hasMapDiv);

  // Check for the Localização section
  const localizacaoText = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes('Localiza') || node.textContent.includes('mapa') || node.textContent.includes('breve')) {
        texts.push(node.textContent.trim());
      }
    }
    return texts;
  });
  console.log('Localização texts:', localizacaoText);

  // Console messages
  console.log('\nConsole messages:');
  consoleMsgs.forEach(m => console.log(m));

  // Now check admin form
  console.log('\n\nNavigating to /admin/novo...');
  consoleMsgs.length = 0;
  await page.goto(`${BASE_URL}/admin/novo`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(5000);

  await page.screenshot({ path: `${EVIDENCE_DIR}/map-debug-admin.png`, fullPage: true });
  console.log('Screenshot saved: map-debug-admin.png');

  const adminContent = await page.content();
  console.log('Admin page has "leaflet":', adminContent.includes('leaflet'));
  console.log('Admin page has "leaflet-container":', adminContent.includes('leaflet-container'));
  console.log('Admin page has "MapPicker":', adminContent.includes('MapPicker'));
  console.log('Admin page has "Clique no mapa":', adminContent.includes('Clique no mapa'));

  // Check form structure
  const formInfo = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return 'No form found';
    const inputs = form.querySelectorAll('input');
    const info = [];
    inputs.forEach(i => info.push({ type: i.type, name: i.name, placeholder: i.placeholder, id: i.id }));
    return { inputCount: inputs.length, inputs: info };
  });
  console.log('Form info:', JSON.stringify(formInfo, null, 2));

  // Console messages for admin
  console.log('\nAdmin console messages:');
  consoleMsgs.forEach(m => console.log(m));

  await browser.close();
}

debug().catch(console.error);
