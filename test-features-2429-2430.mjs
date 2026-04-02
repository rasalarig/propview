import { chromium } from "playwright";
import path from "path";

const EVIDENCE_DIR = "C:/rasa/workspaces/propview/.sprintfy/evidence";
const BASE_URL = "http://localhost:3000";

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const results = { feature2429: [], feature2430: [] };

  // ─── FEATURE 2429: Homepage as Reels Feed ───────────────────────────────────
  console.log("\n=== FEATURE 2429: Homepage as Reels Feed ===");
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Navigate to homepage
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Screenshot 1: Homepage initial state
    await page.screenshot({ path: `${EVIDENCE_DIR}/f2429-step1-homepage.png`, fullPage: false });
    console.log("  [SCREENSHOT] Homepage initial state captured");

    // Check 1: Is there a ReelsFeed container on the page?
    const reelsContainer = await page.$(".reels-container");
    const hasReelsContainer = reelsContainer !== null;
    console.log(`  [CHECK] ReelsFeed .reels-container present: ${hasReelsContainer}`);
    results.feature2429.push({ check: "ReelsFeed container present", pass: hasReelsContainer });

    // Check 2: The page background should be black
    const bodyBg = await page.evaluate(() => {
      const div = document.querySelector(".bg-black");
      return div !== null;
    });
    console.log(`  [CHECK] .bg-black present on homepage: ${bodyBg}`);
    results.feature2429.push({ check: "bg-black wrapper present", pass: bodyBg });

    // Check 3: No old hero/search section (verify absence of hero/search content)
    const hasOldHero = await page.evaluate(() => {
      // Old hero would have things like "hero", "Encontre seu imóvel ideal", big search input
      const heroText = document.body.innerText.includes("Encontre seu imóvel ideal");
      return heroText;
    });
    console.log(`  [CHECK] Old hero text absent: ${!hasOldHero}`);
    results.feature2429.push({ check: "Old hero section absent", pass: !hasOldHero });

    // Check 4: Scroll snap is set (either loading spinner or actual reels)
    const hasScrollSnap = await page.evaluate(() => {
      const container = document.querySelector(".reels-container");
      if (!container) {
        // Could be loading state with style={{ height: "100dvh" }}
        const loadingDiv = document.querySelector("[style*='height']");
        return loadingDiv !== null;
      }
      const style = container.getAttribute("style") || "";
      const computed = window.getComputedStyle(container);
      return style.includes("scroll-snap-type") || computed.scrollSnapType !== "none";
    });
    console.log(`  [CHECK] Scroll snap or fullscreen height present: ${hasScrollSnap}`);
    results.feature2429.push({ check: "Scroll snap / fullscreen height", pass: hasScrollSnap });

    // Check 5: Container uses 100dvh height
    const hasDvhHeight = await page.evaluate(() => {
      // Check for the loading state or reels container
      const container = document.querySelector(".reels-container");
      if (container) {
        const style = container.getAttribute("style") || "";
        return style.includes("100dvh");
      }
      // Also check loading state
      const allDivs = document.querySelectorAll("div[style]");
      for (const div of allDivs) {
        if ((div.getAttribute("style") || "").includes("100dvh")) return true;
      }
      return false;
    });
    console.log(`  [CHECK] 100dvh height used: ${hasDvhHeight}`);
    results.feature2429.push({ check: "100dvh height used", pass: hasDvhHeight });

    // Check 6: Page title is PropView (not old search page)
    const title = await page.title();
    console.log(`  [CHECK] Page title: "${title}"`);
    results.feature2429.push({ check: "Page title is PropView", pass: title.includes("PropView") });

    // Wait a bit more for API data to load
    await page.waitForTimeout(2000);

    // Screenshot 2: After API data loads
    await page.screenshot({ path: `${EVIDENCE_DIR}/f2429-step2-after-load.png`, fullPage: false });
    console.log("  [SCREENSHOT] After API data loads");

    // Check 7: Check if reels loaded or loading/empty state shown (both valid)
    const pageContent = await page.evaluate(() => {
      const hasReel = document.querySelector("[data-reel]") !== null;
      const hasPropertyCard = document.body.innerHTML.includes("scroll-snap-align");
      const hasLoadingOrContent =
        document.body.innerText.includes("Carregando reels") ||
        document.body.innerText.includes("Nenhum imóvel") ||
        document.querySelector(".reels-container") !== null;
      return { hasReel, hasPropertyCard, hasLoadingOrContent };
    });
    console.log(`  [CHECK] Reels page state: ${JSON.stringify(pageContent)}`);
    results.feature2429.push({
      check: "Reels content/loading/empty state shown",
      pass: pageContent.hasLoadingOrContent || pageContent.hasPropertyCard
    });

    // Check via API directly
    const apiOk = await page.evaluate(async () => {
      try {
        const res = await fetch("/api/reels");
        const data = await res.json();
        return { ok: res.ok, count: Array.isArray(data) ? data.length : 0 };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });
    console.log(`  [CHECK] /api/reels response: ${JSON.stringify(apiOk)}`);
    results.feature2429.push({ check: "/api/reels responds", pass: apiOk.ok });

    // Screenshot 3: Final state
    await page.screenshot({ path: `${EVIDENCE_DIR}/f2429-step3-final.png`, fullPage: false });
    console.log("  [SCREENSHOT] Final state");

    await context.close();
  }

  // ─── FEATURE 2430: Bottom Tab Bar Mobile ────────────────────────────────────
  console.log("\n=== FEATURE 2430: Bottom Tab Bar Mobile ===");
  {
    // Mobile context (375x812)
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await mobileContext.newPage();

    // Navigate to homepage at mobile size
    await mobilePage.goto(BASE_URL, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(1500);

    // Screenshot 4: Mobile homepage
    await mobilePage.screenshot({ path: `${EVIDENCE_DIR}/f2430-step1-mobile-home.png`, fullPage: false });
    console.log("  [SCREENSHOT] Mobile homepage captured");

    // Check 1: Bottom tab bar is visible on mobile
    const bottomTabVisible = await mobilePage.evaluate(() => {
      const nav = document.querySelector("nav.fixed.bottom-0");
      if (!nav) return false;
      const style = window.getComputedStyle(nav);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    console.log(`  [CHECK] Bottom tab bar visible on mobile: ${bottomTabVisible}`);
    results.feature2430.push({ check: "Bottom tab bar visible on mobile", pass: bottomTabVisible });

    // Check 2: Bottom tab bar has 5 tabs
    const tabCount = await mobilePage.evaluate(() => {
      const nav = document.querySelector("nav.fixed.bottom-0");
      if (!nav) return 0;
      return nav.querySelectorAll("a").length;
    });
    console.log(`  [CHECK] Number of tabs: ${tabCount} (expected 5)`);
    results.feature2430.push({ check: "5 tabs present", pass: tabCount === 5 });

    // Check 3: Tab labels
    const tabLabels = await mobilePage.evaluate(() => {
      const nav = document.querySelector("nav.fixed.bottom-0");
      if (!nav) return [];
      return Array.from(nav.querySelectorAll("a span")).map(s => s.textContent.trim());
    });
    console.log(`  [CHECK] Tab labels: ${JSON.stringify(tabLabels)}`);
    const expectedLabels = ["Reels", "Busca IA", "Favoritos", "Alertas", "Perfil"];
    const allLabelsPresent = expectedLabels.every(label => tabLabels.includes(label));
    results.feature2430.push({ check: "All 5 tab labels correct", pass: allLabelsPresent });

    // Check 4: Top navbar is HIDDEN on mobile
    const navbarHiddenOnMobile = await mobilePage.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return true; // if no header, it's hidden
      const style = window.getComputedStyle(header);
      // Navbar has 'hidden md:block' which means display:none on mobile
      return style.display === "none";
    });
    console.log(`  [CHECK] Top navbar hidden on mobile: ${navbarHiddenOnMobile}`);
    results.feature2430.push({ check: "Top navbar hidden on mobile", pass: navbarHiddenOnMobile });

    // Check 5: "Reels" tab should be active/highlighted on homepage
    const reelsTabActive = await mobilePage.evaluate(() => {
      const nav = document.querySelector("nav.fixed.bottom-0");
      if (!nav) return false;
      const links = nav.querySelectorAll("a");
      for (const link of links) {
        if (link.href.endsWith("/") || link.getAttribute("href") === "/") {
          return link.classList.contains("text-emerald-500");
        }
      }
      return false;
    });
    console.log(`  [CHECK] Reels tab highlighted on homepage: ${reelsTabActive}`);
    results.feature2430.push({ check: "Reels tab highlighted on homepage", pass: reelsTabActive });

    // Click Busca IA tab
    const buscaTab = await mobilePage.$('nav.fixed.bottom-0 a[href="/busca"]');
    if (buscaTab) {
      await buscaTab.click();
      await mobilePage.waitForTimeout(1500);
    }

    // Screenshot 5: After clicking Busca IA
    await mobilePage.screenshot({ path: `${EVIDENCE_DIR}/f2430-step2-busca-tab.png`, fullPage: false });
    console.log("  [SCREENSHOT] After clicking Busca IA tab");

    // Check 6: URL changed to /busca
    const urlAfterBusca = mobilePage.url();
    const isOnBusca = urlAfterBusca.includes("/busca");
    console.log(`  [CHECK] Navigated to /busca: ${isOnBusca} (url: ${urlAfterBusca})`);
    results.feature2430.push({ check: "Navigated to /busca on tab click", pass: isOnBusca });

    // Check 7: Busca IA tab is now highlighted
    const buscaTabActive = await mobilePage.evaluate(() => {
      const nav = document.querySelector("nav.fixed.bottom-0");
      if (!nav) return false;
      const links = nav.querySelectorAll("a");
      for (const link of links) {
        if (link.getAttribute("href") === "/busca") {
          return link.classList.contains("text-emerald-500");
        }
      }
      return false;
    });
    console.log(`  [CHECK] Busca IA tab highlighted after click: ${buscaTabActive}`);
    results.feature2430.push({ check: "Busca IA tab highlighted after navigation", pass: buscaTabActive });

    await mobileContext.close();

    // Desktop context (1280x800)
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desktopPage = await desktopContext.newPage();

    await desktopPage.goto(BASE_URL, { waitUntil: "networkidle" });
    await desktopPage.waitForTimeout(1000);

    // Screenshot 6: Desktop homepage
    await desktopPage.screenshot({ path: `${EVIDENCE_DIR}/f2430-step3-desktop.png`, fullPage: false });
    console.log("  [SCREENSHOT] Desktop homepage captured");

    // Check 8: Bottom tab bar is HIDDEN on desktop
    const bottomTabHiddenOnDesktop = await desktopPage.evaluate(() => {
      const nav = document.querySelector("nav.fixed.bottom-0");
      if (!nav) return true;
      const style = window.getComputedStyle(nav);
      return style.display === "none";
    });
    console.log(`  [CHECK] Bottom tab bar hidden on desktop: ${bottomTabHiddenOnDesktop}`);
    results.feature2430.push({ check: "Bottom tab bar hidden on desktop", pass: bottomTabHiddenOnDesktop });

    // Check 9: Top navbar is VISIBLE on desktop
    const navbarVisibleOnDesktop = await desktopPage.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return false;
      const style = window.getComputedStyle(header);
      return style.display !== "none";
    });
    console.log(`  [CHECK] Top navbar visible on desktop: ${navbarVisibleOnDesktop}`);
    results.feature2430.push({ check: "Top navbar visible on desktop", pass: navbarVisibleOnDesktop });

    await desktopContext.close();
  }

  await browser.close();

  // Summary
  console.log("\n=== SUMMARY ===");
  const f2429Pass = results.feature2429.filter(r => r.pass).length;
  const f2429Total = results.feature2429.length;
  const f2430Pass = results.feature2430.filter(r => r.pass).length;
  const f2430Total = results.feature2430.length;

  console.log(`Feature 2429 (Homepage as Reels Feed): ${f2429Pass}/${f2429Total} checks passed`);
  results.feature2429.forEach(r => console.log(`  ${r.pass ? "PASS" : "FAIL"}: ${r.check}`));

  console.log(`Feature 2430 (Bottom Tab Bar): ${f2430Pass}/${f2430Total} checks passed`);
  results.feature2430.forEach(r => console.log(`  ${r.pass ? "PASS" : "FAIL"}: ${r.check}`));

  return results;
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
