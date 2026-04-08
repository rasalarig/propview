import { chromium } from 'playwright';

const EVIDENCE_DIR = 'C:/rasa/workspaces/propview/.sprintfy/evidence';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForSearchComplete(page) {
  // Wait for loading to stop - Loader2 spinner disappears
  try {
    await page.waitForFunction(() => {
      const body = document.body.innerText;
      // Results showed up, or "Nenhum resultado" showed up
      return body.includes('resultado encontrado') || body.includes('Nenhum resultado encontrado');
    }, { timeout: 20000 });
  } catch (e) {
    console.log('Timeout waiting, taking screenshot anyway');
    await sleep(2000);
  }
  await sleep(500);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const testQueries = [
  { id: 1, query: 'casa terrea fora de condominio', expected: '0 results' },
  { id: 2, query: 'casa', expected: '2 results (props 3 and 4)' },
  { id: 3, query: 'terreno fora de condominio', expected: '3 results (props 2, 5, 6)' },
  { id: 4, query: 'casa com piscina', expected: '2 results (props 3 and 4)' },
];

for (const test of testQueries) {
  console.log(`\nTEST ${test.id}: "${test.query}" (expected: ${test.expected})`);
  
  const url = `http://localhost:3000/busca?q=${encodeURIComponent(test.query)}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await sleep(500);
  
  await waitForSearchComplete(page);
  
  await page.screenshot({ 
    path: `${EVIDENCE_DIR}/busca-2656-test${test.id}.png`, 
    fullPage: true 
  });
  
  const bodyText = await page.textContent('body');
  
  // Extract result count
  const countMatch = bodyText.match(/(\d+)\s+resultado(?:s)?\s+encontrado/);
  const nenhum = bodyText.includes('Nenhum resultado encontrado');
  
  if (nenhum) {
    console.log(`  Result: 0 results (Nenhum resultado encontrado)`);
  } else if (countMatch) {
    console.log(`  Result: ${countMatch[1]} result(s) found`);
    // Extract property titles from the page
    const titleMatches = bodyText.match(/Terreno[^R\n]+|Casa[^R\n]+/g);
    if (titleMatches) {
      titleMatches.slice(0,5).forEach(t => console.log(`    - ${t.trim().slice(0, 60)}`));
    }
  } else {
    console.log(`  Result: unknown state (still loading?)`);
    console.log(`  Body snippet: ${bodyText.slice(0, 300)}`);
  }
}

console.log('\nAll tests completed');
await browser.close();
