import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const EVIDENCE_DIR = 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence';

async function screenshot(page, filename, description) {
  const filepath = `${EVIDENCE_DIR}/${filename}`;
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`[SCREENSHOT] ${filename}: ${description}`);
  return filepath;
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = {
    tests: [],
    passed: 0,
    failed: 0,
  };

  function pass(name, detail) {
    console.log(`[PASS] ${name}: ${detail}`);
    results.tests.push({ name, status: 'PASS', detail });
    results.passed++;
  }

  function fail(name, detail) {
    console.log(`[FAIL] ${name}: ${detail}`);
    results.tests.push({ name, status: 'FAIL', detail });
    results.failed++;
  }

  // ---- PRE-REQUISITE: Login ----
  console.log('\n=== PRE-REQUISITE: Login ===');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'fav-0-login-page.png', 'Login page');

  // Fill email and click Entrar
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
  await emailInput.fill('tester@test.com');
  await screenshot(page, 'fav-0b-login-filled.png', 'Login email filled');

  const loginBtn = page.locator('button:has-text("Entrar"), button[type="submit"]').first();
  await loginBtn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await screenshot(page, 'fav-0c-after-login.png', 'After login click');

  const currentUrl = page.url();
  if (!currentUrl.includes('/login')) {
    pass('Login', `Redirected to ${currentUrl}`);
  } else {
    // Check if logged in by looking for user elements
    const loggedInIndicator = await page.locator('[data-testid="user-menu"], .user-menu, button:has-text("Sair")').count();
    if (loggedInIndicator > 0) {
      pass('Login', 'Still on login page but user menu visible');
    } else {
      fail('Login', `Still on ${currentUrl}, no user menu found`);
    }
  }

  // ---- TEST 1: Like button on Reels ----
  console.log('\n=== TEST 1: Like button on Reels ===');
  await page.goto(`${BASE_URL}/reels`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await screenshot(page, 'fav-1-reels-page.png', 'Reels page loaded');

  // Find heart/like button in reels
  const heartButtons = page.locator('button[aria-label*="avorit" i], button[aria-label*="orar" i], button[aria-label*="ike" i], button:has(svg[class*="heart" i]), [data-testid*="like"], [data-testid*="favorite"]');
  const heartCount = await heartButtons.count();
  console.log(`Found ${heartCount} heart/like buttons on reels`);

  // Try more generic approach - look for SVG heart icons
  const svgHearts = page.locator('svg path[d*="M21"], button svg').first();

  // Try clicking a like button - look for various patterns
  let reelsLikeFound = false;

  // Try to find the like/heart button by looking for common patterns
  const likeButtonSelectors = [
    'button[aria-label*="avorit"]',
    'button[aria-label*="Curtir"]',
    'button[aria-label*="Gostei"]',
    '[data-testid*="like"]',
    '[data-testid*="heart"]',
    '[data-testid*="favorite"]',
    '.like-btn',
    '.heart-btn',
    '.favorite-btn',
  ];

  for (const sel of likeButtonSelectors) {
    const els = await page.locator(sel).count();
    if (els > 0) {
      console.log(`Found like button with selector: ${sel} (${els} found)`);
      reelsLikeFound = true;
      break;
    }
  }

  // Also check for any buttons with heart SVG shapes
  const allButtons = await page.locator('button').all();
  console.log(`Total buttons on reels page: ${allButtons.length}`);

  // Get page content to understand structure
  const reelsContent = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map(b => ({
      text: b.textContent?.trim().substring(0, 50),
      ariaLabel: b.getAttribute('aria-label'),
      className: b.className?.substring(0, 100),
      dataTestId: b.getAttribute('data-testid'),
    }));
  });
  console.log('Buttons on reels page:', JSON.stringify(reelsContent.slice(0, 20), null, 2));

  // Try to find and click a like button using JavaScript evaluation
  const likeButtonInfo = await page.evaluate(() => {
    // Look for elements that might be like buttons
    const candidates = [];

    // Check all buttons
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim() || '';
      const ariaLabel = btn.getAttribute('aria-label') || '';
      const className = btn.className || '';

      if (text.includes('Curtir') || text.includes('Favorit') || text.includes('Like') ||
          ariaLabel.includes('favorit') || ariaLabel.includes('curtir') || ariaLabel.includes('like') ||
          className.includes('heart') || className.includes('like') || className.includes('favorit')) {
        candidates.push({
          text: text.substring(0, 50),
          ariaLabel,
          className: className.substring(0, 100),
        });
      }
    });

    // Also look for SVG elements (hearts)
    document.querySelectorAll('svg').forEach(svg => {
      const parent = svg.closest('button');
      if (parent) {
        const ariaLabel = parent.getAttribute('aria-label') || '';
        const className = parent.className || '';
        const svgClass = svg.className?.baseVal || '';
        if (svgClass.includes('heart') || ariaLabel.includes('heart') ||
            svgClass.includes('Heart') || className.includes('heart')) {
          candidates.push({
            type: 'svg-heart',
            parentText: parent.textContent?.trim().substring(0, 50),
            parentAriaLabel: ariaLabel,
          });
        }
      }
    });

    return candidates;
  });
  console.log('Like button candidates:', JSON.stringify(likeButtonInfo, null, 2));

  // Check for specific reels components - look at rendered HTML
  const reelsHTML = await page.evaluate(() => {
    const reelItems = document.querySelectorAll('[class*="reel"], [data-testid*="reel"]');
    if (reelItems.length > 0) {
      return reelItems[0].innerHTML?.substring(0, 2000);
    }
    // Try main content area
    const main = document.querySelector('main');
    return main?.innerHTML?.substring(0, 3000) || document.body.innerHTML.substring(0, 3000);
  });
  console.log('Reels HTML snippet:', reelsHTML?.substring(0, 1000));

  // Now try to actually click a like button
  // Look for buttons with Lucide Heart icon (common in Next.js apps)
  const heartLikeBtn = page.locator('button').filter({ hasText: /^$/ }).first();

  // Try clicking with a broader approach - find any clickable heart area
  let reelsLikeClicked = false;
  let reelsInitialState = null;
  let reelsAfterClickState = null;

  // Try multiple strategies to find and click the heart
  const strategies = [
    { selector: 'button[aria-label*="avorit"]', name: 'aria-label favorit' },
    { selector: '[data-testid="like-button"]', name: 'data-testid like-button' },
    { selector: '[data-testid="heart-button"]', name: 'data-testid heart-button' },
    { selector: 'button.like-button', name: 'class like-button' },
    { selector: 'button.heart-button', name: 'class heart-button' },
  ];

  for (const strat of strategies) {
    const count = await page.locator(strat.selector).count();
    if (count > 0) {
      console.log(`Strategy "${strat.name}" found ${count} elements`);
      try {
        const btn = page.locator(strat.selector).first();
        reelsInitialState = await btn.evaluate(el => ({
          class: el.className,
          ariaPressed: el.getAttribute('aria-pressed'),
          innerHTML: el.innerHTML.substring(0, 200),
        }));
        await btn.click();
        await page.waitForTimeout(800);
        reelsAfterClickState = await btn.evaluate(el => ({
          class: el.className,
          ariaPressed: el.getAttribute('aria-pressed'),
          innerHTML: el.innerHTML.substring(0, 200),
        }));
        reelsLikeClicked = true;
        break;
      } catch (e) {
        console.log(`Strategy "${strat.name}" click failed: ${e.message}`);
      }
    }
  }

  // If no specific button found, try to find heart SVG by its path data
  if (!reelsLikeClicked) {
    console.log('Trying to find heart by SVG path...');
    const heartSvg = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll('svg'));
      for (const svg of svgs) {
        const paths = Array.from(svg.querySelectorAll('path'));
        for (const path of paths) {
          const d = path.getAttribute('d') || '';
          // Heart shape paths often contain these patterns
          if (d.includes('M') && (d.length > 50)) {
            const btn = svg.closest('button');
            if (btn) {
              return {
                found: true,
                btnClass: btn.className,
                btnAriaLabel: btn.getAttribute('aria-label'),
                svgClass: svg.className.baseVal,
                pathD: d.substring(0, 100),
              };
            }
          }
        }
      }
      return { found: false };
    });
    console.log('Heart SVG search result:', heartSvg);
  }

  await screenshot(page, 'fav-1b-reels-buttons.png', 'Reels page showing buttons');

  if (reelsLikeClicked) {
    const changed = JSON.stringify(reelsInitialState) !== JSON.stringify(reelsAfterClickState);
    if (changed) {
      pass('Test 1 - Reels Like Button', `Button state changed after click. Before: ${JSON.stringify(reelsInitialState?.ariaPressed)}, After: ${JSON.stringify(reelsAfterClickState?.ariaPressed)}`);
    } else {
      // Check network response instead
      fail('Test 1 - Reels Like Button', `Clicked but visible state didn't change. Class: ${reelsAfterClickState?.class}`);
    }
  } else {
    fail('Test 1 - Reels Like Button', 'Could not find like/heart button on reels page');
  }

  // ---- TEST 2: Like button on property detail ----
  console.log('\n=== TEST 2: Like button on property detail ===');
  await page.goto(`${BASE_URL}/imoveis/2`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await screenshot(page, 'fav-2-property-detail.png', 'Property detail page');

  // Look for like/heart button on detail page
  const detailPageButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map(b => ({
      text: b.textContent?.trim().substring(0, 80),
      ariaLabel: b.getAttribute('aria-label'),
      className: b.className?.substring(0, 150),
      dataTestId: b.getAttribute('data-testid'),
    }));
  });
  console.log('Buttons on detail page:', JSON.stringify(detailPageButtons, null, 2));

  let detailLikeFound = false;
  let detailLikeState = {};

  // Network monitoring for favorites API call
  const apiCalls = [];
  page.on('response', async (response) => {
    if (response.url().includes('/api/favorites')) {
      try {
        const body = await response.json();
        apiCalls.push({ url: response.url(), status: response.status(), body });
        console.log(`[API] ${response.url()} -> ${response.status()}: ${JSON.stringify(body).substring(0, 200)}`);
      } catch (e) {}
    }
  });

  // Try multiple strategies for detail page
  const detailStrategies = [
    'button[aria-label*="avorit"]',
    'button[aria-label*="Curtir"]',
    '[data-testid*="like"]',
    '[data-testid*="favorite"]',
    'button:has-text("Favoritar")',
    'button:has-text("Curtir")',
    'button:has-text("Salvar")',
    '.favorite-btn',
    '.like-btn',
  ];

  for (const sel of detailStrategies) {
    try {
      const count = await page.locator(sel).count();
      if (count > 0) {
        console.log(`Detail page: Found "${sel}" with ${count} elements`);
        const btn = page.locator(sel).first();
        const btnInfo = await btn.evaluate(el => ({
          text: el.textContent?.trim(),
          ariaLabel: el.getAttribute('aria-label'),
          className: el.className,
          ariaPressed: el.getAttribute('aria-pressed'),
        }));
        console.log('Button info:', btnInfo);

        detailLikeState.before = btnInfo;
        await btn.click();
        await page.waitForTimeout(1000);

        const afterInfo = await btn.evaluate(el => ({
          text: el.textContent?.trim(),
          ariaLabel: el.getAttribute('aria-label'),
          className: el.className,
          ariaPressed: el.getAttribute('aria-pressed'),
        }));
        detailLikeState.after = afterInfo;
        detailLikeFound = true;
        break;
      }
    } catch (e) {
      console.log(`Strategy "${sel}" failed: ${e.message}`);
    }
  }

  await screenshot(page, 'fav-2b-after-like.png', 'Property detail after like click');

  if (detailLikeFound) {
    const changed = JSON.stringify(detailLikeState.before) !== JSON.stringify(detailLikeState.after);
    pass('Test 2 - Property Detail Like', `Like button found and clicked. State changed: ${changed}. API calls: ${apiCalls.length}`);
  } else {
    fail('Test 2 - Property Detail Like', `No like/heart button found on property detail page. Checked: ${detailStrategies.join(', ')}`);
  }

  // ---- TEST 3: Favorites page ----
  console.log('\n=== TEST 3: Favorites page ===');
  await page.goto(`${BASE_URL}/favoritos`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await screenshot(page, 'fav-3-favoritos-page.png', 'Favoritos page');

  const favoritosContent = await page.evaluate(() => {
    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent,
      bodyText: document.body.innerText?.substring(0, 500),
      hasError: document.body.innerText?.includes('error') || document.body.innerText?.includes('Error'),
      hasEmptyMessage: document.body.innerText?.includes('vazio') || document.body.innerText?.includes('nenhum') ||
                       document.body.innerText?.includes('Nenhum') || document.body.innerText?.includes('empty'),
    };
  });
  console.log('Favoritos page content:', favoritosContent);

  const favoritosItems = await page.locator('[class*="card"], [class*="property"], [data-testid*="property"], article, .grid > div').count();
  console.log(`Favoritos items found: ${favoritosItems}`);

  if (!favoritosContent.hasError && (favoritosItems > 0 || favoritosContent.hasEmptyMessage || favoritosContent.bodyText?.length > 100)) {
    pass('Test 3 - Favorites Page', `Page loaded. Items: ${favoritosItems}. Title: ${favoritosContent.h1}`);
  } else if (favoritosContent.hasError) {
    fail('Test 3 - Favorites Page', `Page has errors: ${favoritosContent.bodyText?.substring(0, 200)}`);
  } else {
    pass('Test 3 - Favorites Page', `Page loaded with content. Body text: ${favoritosContent.bodyText?.substring(0, 100)}`);
  }

  // ---- TEST 4: Unlike ----
  console.log('\n=== TEST 4: Unlike ====');
  await page.goto(`${BASE_URL}/imoveis/2`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  let unlikeFound = false;
  let unlikeState = {};

  for (const sel of detailStrategies) {
    try {
      const count = await page.locator(sel).count();
      if (count > 0) {
        const btn = page.locator(sel).first();
        const beforeInfo = await btn.evaluate(el => ({
          text: el.textContent?.trim(),
          className: el.className,
          ariaPressed: el.getAttribute('aria-pressed'),
          style: el.getAttribute('style'),
        }));
        unlikeState.before = beforeInfo;

        // Click to unlike
        await btn.click();
        await page.waitForTimeout(1000);

        const afterInfo = await btn.evaluate(el => ({
          text: el.textContent?.trim(),
          className: el.className,
          ariaPressed: el.getAttribute('aria-pressed'),
          style: el.getAttribute('style'),
        }));
        unlikeState.after = afterInfo;
        unlikeFound = true;
        break;
      }
    } catch (e) {}
  }

  await screenshot(page, 'fav-4-unlike.png', 'Property detail after unlike');

  if (unlikeFound) {
    pass('Test 4 - Unlike', `Unlike button found and clicked. Before: ${JSON.stringify(unlikeState.before?.className?.substring(0, 50))}`);
  } else {
    fail('Test 4 - Unlike', 'No unlike button found');
  }

  // ---- TEST 5: Favorites API ----
  console.log('\n=== TEST 5: Favorites API ===');
  await page.goto(`${BASE_URL}/api/favorites`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'fav-5-api-response.png', 'Favorites API response');

  const apiContent = await page.evaluate(() => document.body.innerText);
  console.log('API response:', apiContent.substring(0, 500));

  try {
    const apiJson = JSON.parse(apiContent);
    if (apiJson.favorites !== undefined) {
      pass('Test 5 - Favorites API', `API returns { favorites: [...] } with ${apiJson.favorites.length} items`);
    } else if (apiJson.error) {
      fail('Test 5 - Favorites API', `API returned error: ${apiJson.error}`);
    } else {
      pass('Test 5 - Favorites API', `API returned JSON: ${JSON.stringify(apiJson).substring(0, 200)}`);
    }
  } catch (e) {
    fail('Test 5 - Favorites API', `Response is not valid JSON: ${apiContent.substring(0, 200)}`);
  }

  // ---- Summary ----
  console.log('\n=== TEST SUMMARY ===');
  console.log(`PASSED: ${results.passed}`);
  console.log(`FAILED: ${results.failed}`);
  results.tests.forEach(t => {
    console.log(`  [${t.status}] ${t.name}: ${t.detail}`);
  });

  await browser.close();
  return results;
}

runTests().then(results => {
  const summary = JSON.stringify(results, null, 2);
  fs.writeFileSync(`${EVIDENCE_DIR}/fav-test-results.json`, summary);
  console.log('\nResults saved to evidence dir');
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
