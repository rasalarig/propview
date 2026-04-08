import { chromium } from "playwright";

const EVIDENCE_DIR = "C:/rasa/workspaces/propview/.sprintfy/evidence";
const BASE_URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE_URL}/busca`, { waitUntil: "networkidle" });
  await sleep(500);

  const textarea = page.locator("textarea");
  await textarea.fill("casa terrea com 3 quartos");
  await sleep(200);

  // Log URL before
  const before = page.url();
  console.log("URL before Enter:", before);

  // Press Enter (not Shift+Enter)
  await textarea.press("Enter");
  await sleep(1000);

  const after = page.url();
  console.log("URL after Enter:", after);

  const pass = after.includes("/busca?q=");
  console.log("Enter navigates to /busca?q=...:", pass ? "PASS" : "FAIL");

  await page.screenshot({ path: `${EVIDENCE_DIR}/desktop-enter-submit.png` });

  await browser.close();
  process.exit(pass ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
