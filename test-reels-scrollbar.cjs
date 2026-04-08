const { chromium } = require('./node_modules/playwright');

const EVIDENCE_DIR = 'C:/rasa/workspaces/propview/sprintfy-evidence';

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('=== DESKTOP: Detailed scrollbar check ===');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/reels', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  
  const scrollDetails = await page.evaluate(() => {
    const html = document.documentElement;
    const hasScrollbar = window.innerWidth - document.documentElement.clientWidth > 0;
    
    // Check pt-16 wrapper
    const ptDiv = document.querySelector('.pt-16');
    const ptRect = ptDiv ? ptDiv.getBoundingClientRect() : null;
    
    // Check the overflow-hidden container (phone wrapper)
    const overflowHiddenEls = Array.from(document.querySelectorAll('div')).filter(el => {
      return window.getComputedStyle(el).overflow === 'hidden' && el.getBoundingClientRect().height > 100;
    });
    
    return {
      windowInnerWidth: window.innerWidth,
      documentClientWidth: document.documentElement.clientWidth,
      hasHorizontalScrollbar: hasScrollbar,
      htmlScrollHeight: html.scrollHeight,
      htmlClientHeight: html.clientHeight,
      extraScrollHeight: html.scrollHeight - html.clientHeight,
      ptWrapper: ptRect ? { height: Math.round(ptRect.height), bottom: Math.round(ptRect.bottom) } : null,
      overflowHiddenContainers: overflowHiddenEls.slice(0, 3).map(el => ({
        class: el.className.substring(0, 80),
        height: Math.round(el.getBoundingClientRect().height),
        bottom: Math.round(el.getBoundingClientRect().bottom),
      })),
      htmlOverflowY: window.getComputedStyle(html).overflowY,
      bodyOverflowY: window.getComputedStyle(document.body).overflowY,
    };
  });
  console.log('Desktop scroll details:', JSON.stringify(scrollDetails, null, 2));
  
  // Check CSS for scrollbar-hide class
  const cssCheck = await page.evaluate(() => {
    const reelsContainer = document.querySelector('.reels-container');
    if (!reelsContainer) return 'reels-container not found';
    const styles = window.getComputedStyle(reelsContainer);
    return {
      scrollbarWidth: styles.scrollbarWidth,
      overflowY: styles.overflowY,
      height: styles.height,
    };
  });
  console.log('Reels container CSS:', cssCheck);
  
  await page.screenshot({ path: `${EVIDENCE_DIR}/reels-desktop-scrollcheck.png`, fullPage: false });
  console.log('Desktop screenshot saved');
  
  console.log('\n=== MOBILE: Scrollbar check ===');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:3000/reels', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  
  const mobileDetails = await page.evaluate(() => {
    const html = document.documentElement;
    return {
      windowInnerWidth: window.innerWidth,
      documentClientWidth: document.documentElement.clientWidth,
      scrollbarWidth: window.innerWidth - document.documentElement.clientWidth,
      hasScrollbar: window.innerWidth - document.documentElement.clientWidth > 0,
      htmlScrollHeight: html.scrollHeight,
      htmlClientHeight: html.clientHeight,
      extraHeight: html.scrollHeight - html.clientHeight,
      htmlOverflowY: window.getComputedStyle(html).overflowY,
    };
  });
  console.log('Mobile details:', JSON.stringify(mobileDetails, null, 2));
  
  await page.screenshot({ path: `${EVIDENCE_DIR}/reels-mobile-scrollcheck.png`, fullPage: false });
  console.log('Mobile screenshot saved');
  
  await browser.close();
  console.log('Done');
}

runTests().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
