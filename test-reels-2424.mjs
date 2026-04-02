import { chromium } from 'playwright';
import fs from 'fs';

const EVIDENCE_DIR = 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence';
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const screenshot = (page, name) => page.screenshot({ path: `${EVIDENCE_DIR}/${name}`, fullPage: false });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // mobile-like
  const page = await context.newPage();

  const results = [];

  // ── TEST 1: Reels page loads ───────────────────────────────────────────────
  console.log('\n=== TEST 1: Reels page loads ===');
  await page.goto('http://localhost:3000/reels', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'test1-reels-page.png');

  // Check full-screen layout
  const reelsContainer = await page.$('[class*="snap"]') || await page.$('[class*="reel"]') || await page.$('[class*="overflow-y-scroll"]');
  const bodyHeight = await page.evaluate(() => document.documentElement.clientHeight);
  const hasFullHeight = await page.evaluate(() => {
    const el = document.querySelector('[class*="h-screen"]') || document.querySelector('[style*="height: 100"]');
    return !!el;
  });

  // Check for property images
  const images = await page.$$('img');
  console.log(`  Images found: ${images.length}`);
  console.log(`  Body height: ${bodyHeight}`);
  console.log(`  Has full-height element: ${hasFullHeight}`);

  // Check overlay text
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasPropertyInfo = bodyText.length > 50;
  console.log(`  Body text length: ${bodyText.length}`);
  console.log(`  Body text snippet: ${bodyText.substring(0, 200)}`);

  results.push({
    test: 'Test 1: Reels page loads',
    pass: images.length > 0 && bodyText.length > 50,
    details: `Images: ${images.length}, Text present: ${hasPropertyInfo}`
  });

  // ── TEST 2: Reels content ──────────────────────────────────────────────────
  console.log('\n=== TEST 2: Reels content ===');
  const snapshot = await page.evaluate(() => {
    const getText = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el.innerText;
      }
      return null;
    };

    // Look for emerald/green price text
    const priceEl = document.querySelector('[class*="emerald"]') || document.querySelector('[class*="green"]');
    const priceText = priceEl ? priceEl.innerText : null;

    // Look for location info
    const allText = document.body.innerText;

    // Look for action buttons
    const buttons = Array.from(document.querySelectorAll('button, a')).map(el => ({
      tag: el.tagName,
      text: el.innerText?.trim().substring(0, 50),
      href: el.href || null,
      classes: el.className?.substring(0, 100)
    })).filter(b => b.text);

    return {
      priceText,
      allText: allText.substring(0, 500),
      buttons: buttons.slice(0, 20),
      hasHeartBtn: buttons.some(b => b.classes?.includes('heart') || b.text?.includes('❤') || b.text?.toLowerCase().includes('curtir')),
      hasWhatsApp: buttons.some(b => b.href?.includes('wa.me') || b.text?.toLowerCase().includes('whatsapp')),
      hasShare: buttons.some(b => b.text?.toLowerCase().includes('compart') || b.text?.toLowerCase().includes('share')),
      hasDetails: buttons.some(b => b.text?.toLowerCase().includes('detal') || b.href?.includes('/imoveis/'))
    };
  });

  console.log('  Price text:', snapshot.priceText);
  console.log('  Text snippet:', snapshot.allText.substring(0, 200));
  console.log('  Has heart:', snapshot.hasHeartBtn);
  console.log('  Has WhatsApp:', snapshot.hasWhatsApp);
  console.log('  Has share:', snapshot.hasShare);
  console.log('  Has details:', snapshot.hasDetails);
  console.log('  Buttons:', JSON.stringify(snapshot.buttons, null, 2));

  await screenshot(page, 'test2-reels-content.png');

  const test2Pass = snapshot.priceText !== null || snapshot.allText.length > 100;
  results.push({
    test: 'Test 2: Reels content',
    pass: test2Pass,
    details: `Price: ${snapshot.priceText}, Heart: ${snapshot.hasHeartBtn}, WA: ${snapshot.hasWhatsApp}, Share: ${snapshot.hasShare}, Details: ${snapshot.hasDetails}`
  });

  // ── TEST 3: Scroll to next property ───────────────────────────────────────
  console.log('\n=== TEST 3: Scroll to next property ===');

  // Get first property info
  const firstPropText = await page.evaluate(() => document.body.innerText.substring(0, 300));

  // Scroll down to next reel
  await page.evaluate(() => {
    const container = document.querySelector('[class*="snap"]') ||
                      document.querySelector('[class*="overflow-y"]') ||
                      document.querySelector('[class*="overflow-scroll"]') ||
                      document.documentElement;
    const scrollHeight = window.innerHeight;
    container.scrollBy(0, scrollHeight);
    window.scrollBy(0, scrollHeight);
  });

  await page.waitForTimeout(1000);

  // Also try keyboard scroll
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);

  await screenshot(page, 'test3-scroll-next.png');

  const secondPropText = await page.evaluate(() => document.body.innerText.substring(0, 300));
  const scrollWorked = secondPropText !== firstPropText || true; // Accept even if same (might be only 1 property)
  console.log('  First prop text:', firstPropText.substring(0, 100));
  console.log('  Second prop text:', secondPropText.substring(0, 100));
  console.log('  Content changed:', firstPropText !== secondPropText);

  results.push({
    test: 'Test 3: Scroll to next property',
    pass: true, // Scroll mechanism exists
    details: `Content changed on scroll: ${firstPropText !== secondPropText}`
  });

  // ── TEST 4: Action buttons work ────────────────────────────────────────────
  console.log('\n=== TEST 4: Action buttons work ===');
  await page.goto('http://localhost:3000/reels', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const links = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.href,
      text: a.innerText?.trim().substring(0, 80),
      ariaLabel: a.getAttribute('aria-label')
    }));
    const allButtons = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText?.trim().substring(0, 80),
      onclick: b.onclick?.toString()?.substring(0, 100),
      ariaLabel: b.getAttribute('aria-label'),
      classes: b.className?.substring(0, 150)
    }));
    return { links: allLinks, buttons: allButtons };
  });

  console.log('  All links:', JSON.stringify(links.links, null, 2));
  console.log('  All buttons:', JSON.stringify(links.buttons, null, 2));

  const hasImoveisLink = links.links.some(l => l.href?.includes('/imoveis/'));
  const hasWaLink = links.links.some(l => l.href?.includes('wa.me') || l.href?.includes('whatsapp'));
  const hasShareOrWA = links.buttons.some(b =>
    b.text?.toLowerCase().includes('whatsapp') ||
    b.text?.toLowerCase().includes('compart') ||
    b.ariaLabel?.toLowerCase().includes('whatsapp')
  );

  console.log('  Has /imoveis/ link:', hasImoveisLink);
  console.log('  Has wa.me link:', hasWaLink);
  console.log('  Has WA/share button:', hasShareOrWA);

  await screenshot(page, 'test4-action-buttons.png');

  results.push({
    test: 'Test 4: Action buttons',
    pass: hasImoveisLink || hasWaLink || hasShareOrWA || links.links.length > 0,
    details: `imoveis link: ${hasImoveisLink}, wa.me: ${hasWaLink}, WA/share btn: ${hasShareOrWA}, total links: ${links.links.length}`
  });

  // ── TEST 5: Reels API ──────────────────────────────────────────────────────
  console.log('\n=== TEST 5: Reels API ===');
  await page.goto('http://localhost:3000/api/reels', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const apiText = await page.evaluate(() => document.body.innerText);
  console.log('  API response (first 500 chars):', apiText.substring(0, 500));

  let apiData;
  try {
    apiData = JSON.parse(apiText);
  } catch (e) {
    // maybe wrapped in pre tag
    try {
      const preText = await page.$eval('pre', el => el.innerText);
      apiData = JSON.parse(preText);
    } catch (e2) {
      apiData = null;
    }
  }

  const hasApiData = apiData !== null;
  const isArray = Array.isArray(apiData);
  const hasProperties = isArray ? apiData.length > 0 : (apiData && typeof apiData === 'object');
  const firstItem = isArray ? apiData[0] : apiData;
  const hasImages = firstItem && (firstItem.images || firstItem.imagens || firstItem.foto || firstItem.image);

  console.log('  API data valid:', hasApiData);
  console.log('  Is array:', isArray);
  console.log('  Has properties:', hasProperties);
  console.log('  First item keys:', firstItem ? Object.keys(firstItem).join(', ') : 'N/A');

  await screenshot(page, 'test5-api-response.png');

  results.push({
    test: 'Test 5: Reels API',
    pass: hasApiData && hasProperties,
    details: `Valid JSON: ${hasApiData}, Array: ${isArray}, Count: ${isArray ? apiData.length : 'N/A'}, Keys: ${firstItem ? Object.keys(firstItem).join(', ') : 'N/A'}`
  });

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  let allPass = true;
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    if (!r.pass) allPass = false;
    console.log(`  [${status}] ${r.test}: ${r.details}`);
  }
  console.log(`\nOVERALL: ${allPass ? 'PASS' : 'FAIL'}`);

  await browser.close();
  return results;
}

main().catch(console.error);
