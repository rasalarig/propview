import { chromium } from "playwright";
import path from "path";

const BASE_URL = "http://localhost:3000";
const EVIDENCE_DIR = "C:/rasa/workspaces/imovel-facil/.sprintfy/evidence";

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = [];

  try {
    // TEST 1: Login page exists and looks good
    console.log("\n=== TEST 1: Login page exists and looks good ===");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const emailInput = await page.locator('input[type="email"]').count();
    const enterButton = await page.locator('button[type="submit"]').count();
    const enterButtonText = await page.locator('button[type="submit"]').textContent().catch(() => "");
    const googleButton = await page.locator('button:has-text("Entrar com Google")').count();

    console.log(`  Email input found: ${emailInput > 0}`);
    console.log(`  Entrar button found: ${enterButton > 0}`);
    console.log(`  Entrar button text: "${enterButtonText}"`);
    console.log(`  Google button found: ${googleButton > 0}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test1-login-page.png`, fullPage: false });

    const test1Pass = emailInput > 0 && enterButton > 0 && googleButton > 0;
    results.push({ name: "Test 1: Login page", pass: test1Pass });
    console.log(`  RESULT: ${test1Pass ? "PASS" : "FAIL"}`);

    // TEST 2: Navbar shows "Entrar" when not logged in
    console.log("\n=== TEST 2: Navbar shows Entrar when not logged in ===");
    await page.goto(`${BASE_URL}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const entrarNavBtn = await page.locator('nav a[href="/login"] button, header a[href="/login"] button').count();
    const entrarVisible = await page.locator('text=Entrar').count();

    console.log(`  Entrar link/button in nav: ${entrarNavBtn}`);
    console.log(`  Entrar text visible anywhere: ${entrarVisible}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test2-navbar-logged-out.png`, fullPage: false });

    const test2Pass = entrarVisible > 0;
    results.push({ name: "Test 2: Navbar Entrar button", pass: test2Pass });
    console.log(`  RESULT: ${test2Pass ? "PASS" : "FAIL"}`);

    // TEST 3: Fake login works
    console.log("\n=== TEST 3: Fake login works ===");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const emailField = page.locator('input[type="email"]');
    await emailField.fill("victor@test.com");
    console.log(`  Typed email: victor@test.com`);

    // Check current URL before login
    const urlBefore = page.url();
    console.log(`  URL before login: ${urlBefore}`);

    await page.locator('button[type="submit"]').click();
    console.log(`  Clicked Entrar button`);

    // Wait for navigation/redirect
    await page.waitForTimeout(2000);

    const urlAfter = page.url();
    console.log(`  URL after login: ${urlAfter}`);

    // Check if redirected away from login page
    const redirected = !urlAfter.includes("/login");
    console.log(`  Redirected away from login: ${redirected}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test3-after-login.png`, fullPage: false });

    const test3Pass = redirected;
    results.push({ name: "Test 3: Fake login redirect", pass: test3Pass });
    console.log(`  RESULT: ${test3Pass ? "PASS" : "FAIL"}`);

    // TEST 4: Logged-in navbar
    console.log("\n=== TEST 4: Logged-in navbar ===");
    // Should still be on home page after login
    await page.waitForTimeout(500);

    const userNameInNav = await page.locator('header button span.font-medium, header span.font-medium').count();
    const reelsLink = await page.locator('a[href="/reels"]').count();
    const favoritosLink = await page.locator('a[href="/favoritos"]').count();
    const alertasLink = await page.locator('a[href="/alertas"]').count();
    const avatarInitial = await page.locator('header .rounded-full').count();

    console.log(`  User name/button in nav: ${userNameInNav}`);
    console.log(`  Reels link visible: ${reelsLink > 0}`);
    console.log(`  Favoritos link visible: ${favoritosLink > 0}`);
    console.log(`  Alertas link visible: ${alertasLink > 0}`);
    console.log(`  Avatar/initial in nav: ${avatarInitial > 0}`);

    // Also check that "Entrar" button is gone
    const entrarGone = await page.locator('a[href="/login"]').count();
    console.log(`  Login link gone: ${entrarGone === 0}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test4-navbar-logged-in.png`, fullPage: false });

    const test4Pass = (reelsLink > 0 || favoritosLink > 0 || alertasLink > 0) && entrarGone === 0;
    results.push({ name: "Test 4: Logged-in navbar", pass: test4Pass });
    console.log(`  RESULT: ${test4Pass ? "PASS" : "FAIL"}`);

    // TEST 5: Logout
    console.log("\n=== TEST 5: Logout ===");

    // Click the user avatar/name to open dropdown
    const userButton = page.locator('header button').filter({ hasText: /[A-Z]/ }).first();
    // Try clicking on user avatar area
    try {
      // Find the user button (avatar circle with initial)
      const avatarBtn = page.locator('header button').first();
      await avatarBtn.click();
      await page.waitForTimeout(500);

      const logoutBtn = page.locator('button:has-text("Sair"), button:has-text("Logout"), button:has-text("Sair")');
      const logoutCount = await logoutBtn.count();
      console.log(`  Logout button visible in dropdown: ${logoutCount}`);

      if (logoutCount > 0) {
        await logoutBtn.first().click();
        await page.waitForTimeout(1500);
        console.log(`  Clicked logout`);
      } else {
        console.log("  Could not find logout button in dropdown, trying direct approach");
        // Try locating the LogOut icon button
        const sairBtn = page.locator('text=Sair');
        if (await sairBtn.count() > 0) {
          await sairBtn.first().click();
          await page.waitForTimeout(1500);
        }
      }
    } catch (e) {
      console.log(`  Error clicking user button: ${e.message}`);
    }

    await page.screenshot({ path: `${EVIDENCE_DIR}/test5-after-logout.png`, fullPage: false });

    // After logout, check if "Entrar" button reappears
    const entrarBack = await page.locator('text=Entrar').count();
    console.log(`  Entrar button back: ${entrarBack > 0}`);

    const test5Pass = entrarBack > 0;
    results.push({ name: "Test 5: Logout", pass: test5Pass });
    console.log(`  RESULT: ${test5Pass ? "PASS" : "FAIL"}`);

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }

  // Summary
  console.log("\n=== TEST SUMMARY ===");
  let allPass = true;
  for (const r of results) {
    console.log(`  ${r.pass ? "PASS" : "FAIL"}: ${r.name}`);
    if (!r.pass) allPass = false;
  }
  console.log(`\nOVERALL: ${allPass ? "PASS" : "FAIL"} (${results.filter(r => r.pass).length}/${results.length} passed)`);

  return { results, allPass };
}

runTests().catch(console.error);
