import { chromium } from "playwright";
import path from "path";

const EVIDENCE_DIR = "C:/rasa/workspaces/propview/.sprintfy/evidence";
const BASE_URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // ── DESKTOP TEST ───────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/busca`, { waitUntil: "networkidle" });
    await sleep(500);

    // 1. Verify textarea exists with rows=3
    const textareaTag = await page.evaluate(() => {
      const el = document.querySelector("textarea");
      return el ? { tag: el.tagName, rows: el.rows, type: "TEXTAREA" } : null;
    });
    results.push({ check: "textarea element exists", pass: !!textareaTag && textareaTag.tag === "TEXTAREA" });
    results.push({ check: "textarea has rows=3", pass: textareaTag && textareaTag.rows === 3 });

    // 2. Verify button is visible and not cut off
    const buttonVisible = await page.evaluate(() => {
      const btn = document.querySelector("button[type=submit]");
      if (!btn) return false;
      const rect = btn.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom <= window.innerHeight + 10 && rect.right <= window.innerWidth + 10;
    });
    results.push({ check: "desktop: button visible and not cut off", pass: buttonVisible });

    // 3. Screenshot desktop empty state
    await page.screenshot({ path: `${EVIDENCE_DIR}/desktop-empty.png`, fullPage: false });

    // 4. Type long prompt
    const textarea = page.locator("textarea");
    await textarea.fill("casa terrea com 3 quartos fora de condominio perto de escola com area verde e jardim");
    await sleep(300);
    await page.screenshot({ path: `${EVIDENCE_DIR}/desktop-long-prompt.png`, fullPage: false });

    // 5. Verify text is in textarea (wraps)
    const textareaValue = await textarea.inputValue();
    results.push({ check: "desktop: long prompt visible in textarea", pass: textareaValue.includes("casa terrea") });

    // 6. Verify button layout - should be right-aligned (flex justify-end)
    const buttonLayout = await page.evaluate(() => {
      const btn = document.querySelector("button[type=submit]");
      if (!btn) return null;
      const container = btn.parentElement;
      if (!container) return null;
      const containerStyle = window.getComputedStyle(container);
      return {
        justifyContent: containerStyle.justifyContent,
        btnWidth: btn.getBoundingClientRect().width,
        containerWidth: container.getBoundingClientRect().width,
      };
    });
    // On desktop, button should NOT be full width (w-auto)
    results.push({
      check: "desktop: button is right-aligned (not full width)",
      pass: buttonLayout && buttonLayout.btnWidth < buttonLayout.containerWidth,
    });

    // 7. Test Enter key submits form (check URL changes)
    const currentUrl = page.url();
    await textarea.press("Enter");
    await sleep(600);
    const newUrl = page.url();
    results.push({ check: "Enter key navigates to /busca?q=...", pass: newUrl.includes("/busca?q=") });
    await page.screenshot({ path: `${EVIDENCE_DIR}/desktop-after-submit.png`, fullPage: false });

    await ctx.close();
  }

  // ── MOBILE TEST ────────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/busca`, { waitUntil: "networkidle" });
    await sleep(500);

    // 1. Verify textarea full width on mobile
    const mobileLayout = await page.evaluate(() => {
      const textarea = document.querySelector("textarea");
      const btn = document.querySelector("button[type=submit]");
      if (!textarea || !btn) return null;
      const taRect = textarea.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      return {
        textareaWidth: taRect.width,
        buttonWidth: btnRect.width,
        viewportWidth,
        btnRight: btnRect.right,
        btnBottom: btnRect.bottom,
        viewportHeight: window.innerHeight,
      };
    });

    results.push({ check: "mobile: textarea renders", pass: !!mobileLayout });
    results.push({
      check: "mobile: button not cut off (right edge within viewport)",
      pass: mobileLayout && mobileLayout.btnRight <= mobileLayout.viewportWidth + 5,
    });
    results.push({
      check: "mobile: button not cut off (bottom edge within viewport)",
      pass: mobileLayout && mobileLayout.btnBottom <= mobileLayout.viewportHeight + 200, // allow scrolling
    });

    // 2. Screenshot mobile empty state
    await page.screenshot({ path: `${EVIDENCE_DIR}/mobile-empty.png`, fullPage: false });

    // 3. Type long prompt on mobile
    const textarea = page.locator("textarea");
    await textarea.fill("casa terrea com 3 quartos fora de condominio perto de escola com area verde e jardim");
    await sleep(300);
    await page.screenshot({ path: `${EVIDENCE_DIR}/mobile-long-prompt.png`, fullPage: false });

    // 4. Check button is full width on mobile (w-full class)
    const mobileBtnFullWidth = await page.evaluate(() => {
      const btn = document.querySelector("button[type=submit]");
      if (!btn) return false;
      const container = btn.parentElement;
      if (!container) return false;
      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      // On mobile, button should be nearly as wide as container
      return btnRect.width >= containerRect.width * 0.9;
    });
    results.push({ check: "mobile: button is full width", pass: mobileBtnFullWidth });

    await ctx.close();
  }

  await browser.close();

  // Print results
  console.log("\n===== TEST RESULTS =====");
  let pass = 0, fail = 0;
  for (const r of results) {
    const icon = r.pass ? "PASS" : "FAIL";
    console.log(`[${icon}] ${r.check}`);
    if (r.pass) pass++; else fail++;
  }
  console.log(`\nTotal: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
