import { chromium } from "playwright";

const EVIDENCE_DIR = "C:/rasa/workspaces/propview/.sprintfy/evidence";
const BASE_URL = "http://localhost:3000";

async function consoleTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const allMessages = [];
  page.on("console", msg => {
    allMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === "error") console.log(`  [CONSOLE ERROR] ${msg.text()}`);
  });
  page.on("pageerror", err => {
    console.log(`  [PAGE ERROR] ${err.message}`);
  });

  await page.goto(BASE_URL, { waitUntil: "load" });
  await page.waitForTimeout(8000);

  console.log("All console messages:", JSON.stringify(allMessages, null, 2));

  // Try to manually fetch from the browser console
  const manualFetch = await page.evaluate(async () => {
    try {
      const res = await fetch("/api/reels");
      const data = await res.json();
      return { ok: true, status: res.status, count: data.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  console.log("Manual fetch result:", manualFetch);

  await page.screenshot({ path: `${EVIDENCE_DIR}/f2429-console-debug.png` });

  await context.close();
  await browser.close();
}

consoleTest().catch(err => { console.error(err); process.exit(1); });
