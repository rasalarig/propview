const { chromium } = require('./node_modules/playwright');

const EVIDENCE_DIR = 'C:/rasa/workspaces/propview/sprintfy-evidence';

async function runTests() {
  const browser = await chromium.launch({ headless: true });

  console.log('=== TEST 1: Desktop 1280x800 ===');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewportSize({ width: 1280, height: 800 });
  await desktopPage.goto('http://localhost:3000/reels', { waitUntil: 'networkidle', timeout: 15000 });
  await desktopPage.waitForTimeout(2000);
  
  const desktopScrollInfo = await desktopPage.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlScrollHeight: html.scrollHeight,
      htmlClientHeight: html.clientHeight,
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
      htmlOverflowY: window.getComputedStyle(html).overflowY,
      bodyOverflowY: window.getComputedStyle(body).overflowY,
      hasVerticalScrollbar: html.scrollHeight > html.clientHeight,
    };
  });
  console.log('Desktop scroll info:', JSON.stringify(desktopScrollInfo, null, 2));
  
  const phoneContainer = await desktopPage.evaluate(() => {
    const allDivs = document.querySelectorAll('div');
    const results = [];
    allDivs.forEach(el => {
      const cls = el.className;
      if (cls && (cls.includes('aspect') || cls.includes('rounded-3xl'))) {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        results.push({
          class: cls.substring(0, 120),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          borderRadius: styles.borderRadius,
          overflow: styles.overflow,
        });
      }
    });
    return results;
  });
  console.log('Phone-shaped containers:', JSON.stringify(phoneContainer, null, 2));
  
  const images = await desktopPage.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    return Array.from(imgs).slice(0, 5).map(img => ({
      src: img.src.substring(0, 80),
      complete: img.complete,
      naturalWidth: img.naturalWidth,
    }));
  });
  console.log('Images:', JSON.stringify(images, null, 2));
  
  await desktopPage.screenshot({ path: `${EVIDENCE_DIR}/reels-desktop-1280x800.png`, fullPage: false });
  console.log('Desktop screenshot saved');
  await desktopPage.close();
  
  console.log('\n=== TEST 2: Mobile 375x812 ===');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewportSize({ width: 375, height: 812 });
  await mobilePage.goto('http://localhost:3000/reels', { waitUntil: 'networkidle', timeout: 15000 });
  await mobilePage.waitForTimeout(2000);
  
  const mobileScrollInfo = await mobilePage.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlScrollHeight: html.scrollHeight,
      htmlClientHeight: html.clientHeight,
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
      htmlOverflowY: window.getComputedStyle(html).overflowY,
      bodyOverflowY: window.getComputedStyle(body).overflowY,
      hasVerticalScrollbar: html.scrollHeight > html.clientHeight,
      scrollbarWidth: window.innerWidth - document.documentElement.clientWidth,
    };
  });
  console.log('Mobile scroll info:', JSON.stringify(mobileScrollInfo, null, 2));
  
  const tabBarInfo = await mobilePage.evaluate(() => {
    const allEls = document.querySelectorAll('nav, [class*="tab-bar"], [class*="bottom-tab"], footer');
    const results = [];
    allEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      if (rect.height > 0 && styles.display !== 'none') {
        results.push({
          tag: el.tagName,
          class: el.className.substring(0, 100),
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
        });
      }
    });
    return results;
  });
  console.log('Tab bar elements:', JSON.stringify(tabBarInfo, null, 2));
  
  await mobilePage.screenshot({ path: `${EVIDENCE_DIR}/reels-mobile-375x812.png`, fullPage: false });
  console.log('Mobile screenshot saved');
  await mobilePage.close();
  
  await browser.close();
  console.log('\nAll tests completed successfully');
}

runTests().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
