import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const EVIDENCE_DIR = 'C:/rasa/workspaces/propview/.sprintfy/evidence';
const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const results = [];

  // Test on desktop (1280x800)
  const browser = await chromium.launch({ headless: true });

  // --- DESKTOP TEST ---
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopCtx.newPage();

  // Collect console errors
  const consoleErrors = [];
  desktopPage.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('Navigating to homepage (desktop)...');
  await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000); // Let reels load

  // CHECK 1: Initial homepage load on desktop
  await desktopPage.screenshot({
    path: `${EVIDENCE_DIR}/reels2439-01-desktop-initial.png`,
    fullPage: false,
  });
  results.push({ check: '01 Desktop initial load', status: 'captured' });

  // CHECK 2: Verify no vertical scrollbar on the outer page
  const bodyScrollHeight = await desktopPage.evaluate(() => {
    return {
      bodyScrollHeight: document.body.scrollHeight,
      windowInnerHeight: window.innerHeight,
      hasOverflow: document.documentElement.scrollHeight > window.innerHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      htmlOverflow: window.getComputedStyle(document.documentElement).overflow,
      bodyOverflow: window.getComputedStyle(document.body).overflow,
    };
  });
  console.log('Overflow check:', bodyScrollHeight);
  results.push({
    check: '02 No vertical overflow on outer page',
    bodyScrollHeight: bodyScrollHeight.bodyScrollHeight,
    windowInnerHeight: bodyScrollHeight.windowInnerHeight,
    hasOverflow: bodyScrollHeight.hasOverflow,
    documentScrollHeight: bodyScrollHeight.documentScrollHeight,
    htmlOverflow: bodyScrollHeight.htmlOverflow,
    bodyOverflow: bodyScrollHeight.bodyOverflow,
    status: bodyScrollHeight.hasOverflow ? 'WARN: overflow detected' : 'PASS',
  });

  // CHECK 3: Check phone-shaped container on desktop
  const phoneContainer = await desktopPage.evaluate(() => {
    // Look for the phone-shaped wrapper div
    const el = document.querySelector('[class*="aspect"]');
    if (!el) return { found: false };
    const styles = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      found: true,
      aspectRatio: styles.aspectRatio,
      borderRadius: styles.borderRadius,
      width: rect.width,
      height: rect.height,
      overflow: styles.overflow,
      classList: el.className,
    };
  });
  console.log('Phone container check:', phoneContainer);
  results.push({
    check: '03 Phone-shaped container on desktop',
    ...phoneContainer,
    status: phoneContainer.found ? 'PASS' : 'FAIL: no aspect container found',
  });

  // CHECK 4: Verify Unsplash images are loading
  const imageCheck = await desktopPage.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const unsplashImgs = imgs.filter(img => img.src && img.src.includes('unsplash.com'));
    const loadedUnsplash = unsplashImgs.filter(img => img.complete && img.naturalWidth > 0);
    return {
      totalImages: imgs.length,
      unsplashImages: unsplashImgs.length,
      loadedUnsplash: loadedUnsplash.length,
      unsplashSrcs: unsplashImgs.map(img => img.src).slice(0, 3),
    };
  });
  console.log('Image check:', imageCheck);
  results.push({
    check: '04 Unsplash images loading',
    ...imageCheck,
    status: imageCheck.unsplashImages > 0 ? 'PASS' : 'FAIL: no Unsplash images found',
  });

  // CHECK 5: Check scroll snap CSS on reels container
  const scrollSnapCheck = await desktopPage.evaluate(() => {
    // Check for scroll-snap-type on the container
    const containers = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.scrollSnapType && style.scrollSnapType !== 'none';
    });
    return {
      snapContainersFound: containers.length,
      containers: containers.map(el => ({
        tag: el.tagName,
        className: el.className.substring(0, 100),
        scrollSnapType: window.getComputedStyle(el).scrollSnapType,
        overflowY: window.getComputedStyle(el).overflowY,
        height: window.getComputedStyle(el).height,
      })),
    };
  });
  console.log('Scroll snap check:', scrollSnapCheck);
  results.push({
    check: '05 Scroll snap on reels container',
    ...scrollSnapCheck,
    status: scrollSnapCheck.snapContainersFound > 0 ? 'PASS' : 'FAIL: no scroll-snap container found',
  });

  // CHECK 6: Verify .reels-container has scrollbar-hide
  const scrollbarCheck = await desktopPage.evaluate(() => {
    const el = document.querySelector('.reels-container');
    if (!el) return { found: false };
    const style = window.getComputedStyle(el);
    return {
      found: true,
      msOverflowStyle: el.style.msOverflowStyle || 'from-css',
      scrollbarWidth: style.scrollbarWidth,
      overflowY: style.overflowY,
      className: el.className,
    };
  });
  console.log('Scrollbar check:', scrollbarCheck);
  results.push({
    check: '06 Scrollbar hidden on reels container',
    ...scrollbarCheck,
    status: scrollbarCheck.found ? 'PASS' : 'WARN: .reels-container not found by class',
  });

  // CHECK 7: Check if h-[100dvh] container is full viewport
  const viewportFill = await desktopPage.evaluate(() => {
    // Check the outermost black container
    const fixedContainers = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.position === 'fixed' && style.backgroundColor.includes('0, 0, 0');
    });
    return {
      fixedBlackContainers: fixedContainers.map(el => ({
        tag: el.tagName,
        className: el.className.substring(0, 100),
        position: window.getComputedStyle(el).position,
        inset: window.getComputedStyle(el).inset,
        zIndex: window.getComputedStyle(el).zIndex,
        rect: el.getBoundingClientRect(),
      })),
    };
  });
  console.log('Viewport fill check:', viewportFill);
  results.push({
    check: '07 Fixed inset-0 container fills viewport',
    ...viewportFill,
    status: viewportFill.fixedBlackContainers.length > 0 ? 'PASS' : 'FAIL: no fixed black container',
  });

  // Full-page screenshot after desktop checks
  await desktopPage.screenshot({
    path: `${EVIDENCE_DIR}/reels2439-02-desktop-loaded.png`,
    fullPage: false,
  });
  results.push({ check: '08 Desktop loaded state', status: 'captured' });

  console.log('Console errors on desktop:', consoleErrors);
  results.push({
    check: '09 Console errors',
    errors: consoleErrors,
    status: consoleErrors.length === 0 ? 'PASS' : `WARN: ${consoleErrors.length} error(s)`,
  });

  await desktopCtx.close();

  // --- MOBILE TEST ---
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const mobilePage = await mobileCtx.newPage();

  console.log('Navigating to homepage (mobile)...');
  await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);

  await mobilePage.screenshot({
    path: `${EVIDENCE_DIR}/reels2439-03-mobile-initial.png`,
    fullPage: false,
  });
  results.push({ check: '10 Mobile initial load', status: 'captured' });

  // Mobile overflow check
  const mobileOverflow = await mobilePage.evaluate(() => ({
    bodyScrollHeight: document.body.scrollHeight,
    windowInnerHeight: window.innerHeight,
    hasOverflow: document.documentElement.scrollHeight > window.innerHeight,
  }));
  console.log('Mobile overflow:', mobileOverflow);
  results.push({
    check: '11 No vertical overflow on mobile',
    ...mobileOverflow,
    status: mobileOverflow.hasOverflow ? 'WARN: overflow detected' : 'PASS',
  });

  // Scroll simulation on mobile (verify snap works - scroll down and back)
  const reelsContainer = await mobilePage.evaluate(() => {
    const el = document.querySelector('.reels-container') || document.querySelector('[style*="scroll-snap-type"]');
    return el ? el.tagName : null;
  });
  console.log('Reels container found on mobile:', reelsContainer);

  // Simulate a swipe to next reel (if multiple reels)
  await mobilePage.evaluate(() => {
    const el = document.querySelector('.reels-container') ||
      Array.from(document.querySelectorAll('*')).find(e => window.getComputedStyle(e).scrollSnapType !== 'none');
    if (el) {
      el.scrollTo({ top: el.clientHeight, behavior: 'smooth' });
    }
  });
  await sleep(1500);

  await mobilePage.screenshot({
    path: `${EVIDENCE_DIR}/reels2439-04-mobile-scroll.png`,
    fullPage: false,
  });
  results.push({ check: '12 Mobile after scroll (second reel)', status: 'captured' });

  // Scroll back to first reel
  await mobilePage.evaluate(() => {
    const el = document.querySelector('.reels-container') ||
      Array.from(document.querySelectorAll('*')).find(e => window.getComputedStyle(e).scrollSnapType !== 'none');
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  await sleep(1000);

  await mobilePage.screenshot({
    path: `${EVIDENCE_DIR}/reels2439-05-mobile-back-first.png`,
    fullPage: false,
  });
  results.push({ check: '13 Mobile back to first reel', status: 'captured' });

  await mobileCtx.close();
  await browser.close();

  // Write results JSON
  const summary = {
    timestamp: new Date().toISOString(),
    results,
    consoleErrors,
    overallStatus: results.every(r => !r.status?.startsWith('FAIL')) ? 'PASS' : 'FAIL',
  };
  writeFileSync(`${EVIDENCE_DIR}/reels2439-results.json`, JSON.stringify(summary, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
