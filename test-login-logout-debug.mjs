import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const EVIDENCE_DIR = "C:/rasa/workspaces/imovel-facil/.sprintfy/evidence";

async function runLogoutTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // First login
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.locator('input[type="email"]').fill("victor@test.com");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    console.log("URL after login:", page.url());

    // List all buttons in header
    const headerButtons = await page.locator("header button").all();
    console.log(`Header buttons count: ${headerButtons.length}`);
    for (let i = 0; i < headerButtons.length; i++) {
      const text = await headerButtons[i].textContent();
      const isVisible = await headerButtons[i].isVisible();
      console.log(`  Button[${i}]: text="${text?.trim()}" visible=${isVisible}`);
    }

    // Find the user avatar button (the one with user initial)
    // According to code, it's a button with flex items-center gap-2 containing the initial div
    const userAvatarBtn = page.locator('header button').filter({ has: page.locator('.rounded-full') });
    const userAvatarCount = await userAvatarBtn.count();
    console.log(`User avatar button count: ${userAvatarCount}`);

    if (userAvatarCount > 0) {
      await userAvatarBtn.first().click();
      console.log("Clicked user avatar button");
      await page.waitForTimeout(500);

      await page.screenshot({ path: `${EVIDENCE_DIR}/test5-dropdown-open.png`, fullPage: false });

      // Check if dropdown appeared
      const sairBtn = page.locator('text=Sair');
      const sairCount = await sairBtn.count();
      console.log(`Sair button count after click: ${sairCount}`);

      if (sairCount > 0) {
        const sairVisible = await sairBtn.first().isVisible();
        console.log(`Sair button visible: ${sairVisible}`);
        await sairBtn.first().click();
        console.log("Clicked Sair");
        await page.waitForTimeout(1500);

        await page.screenshot({ path: `${EVIDENCE_DIR}/test5-after-logout.png`, fullPage: false });

        const entrarBack = await page.locator('text=Entrar').count();
        console.log(`Entrar button back after logout: ${entrarBack > 0}`);
        console.log(`URL after logout: ${page.url()}`);
        console.log(`LOGOUT TEST: ${entrarBack > 0 ? "PASS" : "FAIL"}`);
      } else {
        // List all visible text on page for debugging
        console.log("Dropdown did not open, checking page content...");
        const bodyText = await page.locator("body").textContent();
        console.log("Looking for 'Sair' in page:", bodyText?.includes("Sair"));
      }
    } else {
      console.log("Could not find user avatar button");

      // Try clicking by aria or other method
      const allButtons = await page.locator("header button, header a").all();
      for (let i = 0; i < allButtons.length; i++) {
        const html = await allButtons[i].innerHTML().catch(() => "");
        console.log(`  Element[${i}] HTML snippet: ${html.substring(0, 150)}`);
      }
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
  }
}

runLogoutTest().catch(console.error);
