import { chromium } from "playwright";

const EVIDENCE_DIR = "C:/rasa/workspaces/propview/.sprintfy/evidence";
const BASE_URL = "http://localhost:3000";

async function debug() {
  const browser = await chromium.launch({ headless: true });

  // ── Debug Feature 2429 ──────────────────────────────────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Capture console errors
    const errors = [];
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Dump HTML structure
    const html = await page.evaluate(() => {
      return {
        bodyClasses: document.body.className,
        mainContent: document.querySelector("main")?.innerHTML?.substring(0, 2000) || "NO MAIN",
        allDivStyles: Array.from(document.querySelectorAll("div[style]")).map(d => ({
          class: d.className,
          style: d.getAttribute("style")
        })).slice(0, 20),
        title: document.title,
        url: window.location.href,
        scrollSnapElements: Array.from(document.querySelectorAll("*")).filter(el => {
          const style = el.getAttribute("style") || "";
          return style.includes("scroll-snap");
        }).map(el => ({
          tag: el.tagName,
          class: el.className,
          style: el.getAttribute("style")
        }))
      };
    });

    console.log("=== Feature 2429 Debug ===");
    console.log("Title:", html.title);
    console.log("URL:", html.url);
    console.log("Body classes:", html.bodyClasses);
    console.log("Scroll snap elements:", JSON.stringify(html.scrollSnapElements, null, 2));
    console.log("Div styles sample:", JSON.stringify(html.allDivStyles.slice(0, 5), null, 2));
    console.log("Main content (truncated):", html.mainContent.substring(0, 500));
    console.log("Console errors:", errors);

    await page.screenshot({ path: `${EVIDENCE_DIR}/f2429-debug.png` });
    await context.close();
  }

  // ── Debug Feature 2430 ──────────────────────────────────────────────────────
  {
    // Mobile
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(1500);

    const mobileInfo = await mobilePage.evaluate(() => {
      const header = document.querySelector("header");
      const bottomNav = document.querySelector("nav.fixed.bottom-0");
      return {
        headerDisplay: header ? window.getComputedStyle(header).display : "no header",
        headerClasses: header ? header.className : "no header",
        bottomNavDisplay: bottomNav ? window.getComputedStyle(bottomNav).display : "no bottom nav",
        bottomNavClasses: bottomNav ? bottomNav.className : "no bottom nav",
        viewportWidth: window.innerWidth
      };
    });

    console.log("\n=== Feature 2430 Mobile Debug ===");
    console.log("Viewport width:", mobileInfo.viewportWidth);
    console.log("Header classes:", mobileInfo.headerClasses);
    console.log("Header computed display:", mobileInfo.headerDisplay);
    console.log("Bottom nav classes:", mobileInfo.bottomNavClasses);
    console.log("Bottom nav computed display:", mobileInfo.bottomNavDisplay);

    await mobileContext.close();

    // Desktop
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto(BASE_URL, { waitUntil: "networkidle" });
    await desktopPage.waitForTimeout(1000);

    const desktopInfo = await desktopPage.evaluate(() => {
      const header = document.querySelector("header");
      const bottomNav = document.querySelector("nav.fixed.bottom-0");
      return {
        headerDisplay: header ? window.getComputedStyle(header).display : "no header",
        bottomNavDisplay: bottomNav ? window.getComputedStyle(bottomNav).display : "no bottom nav",
        viewportWidth: window.innerWidth
      };
    });

    console.log("\n=== Feature 2430 Desktop Debug ===");
    console.log("Viewport width:", desktopInfo.viewportWidth);
    console.log("Header computed display:", desktopInfo.headerDisplay);
    console.log("Bottom nav computed display:", desktopInfo.bottomNavDisplay);

    await desktopContext.close();
  }

  await browser.close();
}

debug().catch(err => { console.error(err); process.exit(1); });
