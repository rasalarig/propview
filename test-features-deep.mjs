import { chromium } from "playwright";

const EVIDENCE_DIR = "C:/rasa/workspaces/propview/.sprintfy/evidence";
const BASE_URL = "http://localhost:3000";

async function deepTest() {
  const browser = await chromium.launch({ headless: false }); // Use headed to get proper CSS

  // ── Feature 2429: Wait for reels to actually load ──────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    // Wait for reels to load (loading spinner to disappear)
    try {
      await page.waitForSelector(".reels-container", { timeout: 8000 });
      console.log("  [OK] .reels-container appeared after loading");
    } catch {
      console.log("  [INFO] .reels-container not found after 8s - checking state");
    }

    const state = await page.evaluate(() => {
      const container = document.querySelector(".reels-container");
      const loadingSpinner = document.querySelector(".animate-spin");
      const allDivStyles = Array.from(document.querySelectorAll("div[style]")).map(d => ({
        class: d.className.substring(0, 80),
        style: d.getAttribute("style")
      }));
      return {
        hasReelsContainer: container !== null,
        containerStyle: container?.getAttribute("style"),
        hasLoadingSpinner: loadingSpinner !== null,
        divStyles: allDivStyles,
        mainInnerText: document.querySelector("main")?.innerText?.substring(0, 200)
      };
    });

    console.log("\n=== Feature 2429 Final State ===");
    console.log("Has .reels-container:", state.hasReelsContainer);
    console.log("Container style:", state.containerStyle);
    console.log("Has loading spinner:", state.hasLoadingSpinner);
    console.log("Div styles:", JSON.stringify(state.divStyles, null, 2));
    console.log("Main text:", state.mainInnerText);

    await page.screenshot({ path: `${EVIDENCE_DIR}/f2429-headed-final.png` });
    await context.close();
  }

  // ── Feature 2430: Headed mode for proper CSS media queries ────────────────
  {
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(1000);

    const mobileCSS = await mobilePage.evaluate(() => {
      const header = document.querySelector("header");
      const bottomNav = document.querySelector("nav.fixed.bottom-0");
      // Check if CSS media query is active
      const mdBreakpointActive = window.matchMedia("(min-width: 768px)").matches;
      return {
        headerDisplay: header ? window.getComputedStyle(header).display : "no header",
        headerClasses: header ? header.className : "no header",
        bottomNavDisplay: bottomNav ? window.getComputedStyle(bottomNav).display : "no bottom nav",
        mdBreakpointActive,
        innerWidth: window.innerWidth
      };
    });

    console.log("\n=== Feature 2430 Mobile (375px) - Headed ===");
    console.log("innerWidth:", mobileCSS.innerWidth);
    console.log("md breakpoint active:", mobileCSS.mdBreakpointActive);
    console.log("Header display:", mobileCSS.headerDisplay);
    console.log("Bottom nav display:", mobileCSS.bottomNavDisplay);

    await mobilePage.screenshot({ path: `${EVIDENCE_DIR}/f2430-headed-mobile.png` });
    await mobileContext.close();

    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto(BASE_URL, { waitUntil: "networkidle" });
    await desktopPage.waitForTimeout(1000);

    const desktopCSS = await desktopPage.evaluate(() => {
      const header = document.querySelector("header");
      const bottomNav = document.querySelector("nav.fixed.bottom-0");
      const mdBreakpointActive = window.matchMedia("(min-width: 768px)").matches;
      return {
        headerDisplay: header ? window.getComputedStyle(header).display : "no header",
        bottomNavDisplay: bottomNav ? window.getComputedStyle(bottomNav).display : "no bottom nav",
        mdBreakpointActive,
        innerWidth: window.innerWidth
      };
    });

    console.log("\n=== Feature 2430 Desktop (1280px) - Headed ===");
    console.log("innerWidth:", desktopCSS.innerWidth);
    console.log("md breakpoint active:", desktopCSS.mdBreakpointActive);
    console.log("Header display:", desktopCSS.headerDisplay);
    console.log("Bottom nav display:", desktopCSS.bottomNavDisplay);

    await desktopPage.screenshot({ path: `${EVIDENCE_DIR}/f2430-headed-desktop.png` });
    await desktopContext.close();
  }

  await browser.close();
}

deepTest().catch(err => { console.error(err); process.exit(1); });
