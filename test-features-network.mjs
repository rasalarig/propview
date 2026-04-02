import { chromium } from "playwright";

const EVIDENCE_DIR = "C:/rasa/workspaces/propview/.sprintfy/evidence";
const BASE_URL = "http://localhost:3000";

async function networkTest() {
  const browser = await chromium.launch({ headless: false });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Track all network requests
  const requests = [];
  page.on("request", req => {
    if (req.url().includes("/api/") || req.url().includes("reels")) {
      requests.push({ url: req.url(), method: req.method() });
    }
  });
  page.on("response", res => {
    if (res.url().includes("/api/") || res.url().includes("reels")) {
      console.log(`  [NETWORK] ${res.status()} ${res.url()}`);
    }
  });

  console.log("Navigating to homepage...");
  await page.goto(BASE_URL);

  // Wait for React hydration
  await page.waitForTimeout(5000);

  const finalState = await page.evaluate(() => {
    return {
      hasReelsContainer: document.querySelector(".reels-container") !== null,
      hasLoadingSpinner: document.querySelector(".animate-spin") !== null,
      innerText: document.querySelector("main")?.innerText?.substring(0, 300),
      reelsDivs: document.querySelectorAll("[style*='scroll-snap']").length
    };
  });

  console.log("Final state after 5s:", JSON.stringify(finalState, null, 2));
  console.log("API requests made:", requests);

  await page.screenshot({ path: `${EVIDENCE_DIR}/f2429-network-final.png` });

  // Now wait more
  await page.waitForTimeout(5000);
  const laterState = await page.evaluate(() => {
    return {
      hasReelsContainer: document.querySelector(".reels-container") !== null,
      hasLoadingSpinner: document.querySelector(".animate-spin") !== null,
      text: document.querySelector("main")?.innerText?.substring(0, 300)
    };
  });
  console.log("State after 10s:", JSON.stringify(laterState, null, 2));
  await page.screenshot({ path: `${EVIDENCE_DIR}/f2429-network-10s.png` });

  await context.close();
  await browser.close();
}

networkTest().catch(err => { console.error(err); process.exit(1); });
