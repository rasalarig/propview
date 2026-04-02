import { chromium } from "playwright";

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
    const enterButtonText = (await page.locator('button[type="submit"]').textContent().catch(() => "")).trim();
    const googleButton = await page.locator('button:has-text("Entrar com Google")').count();
    const logoHome = await page.locator('h1:has-text("ImovelFacil"), h1:has-text("Imovel")').count();

    console.log(`  Email input: ${emailInput > 0 ? "FOUND" : "NOT FOUND"}`);
    console.log(`  Entrar button: ${enterButton > 0 ? "FOUND" : "NOT FOUND"} (text: "${enterButtonText}")`);
    console.log(`  Google button: ${googleButton > 0 ? "FOUND" : "NOT FOUND"}`);
    console.log(`  Logo/branding: ${logoHome > 0 ? "FOUND" : "NOT FOUND"}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test1-login-page.png`, fullPage: false });

    const test1Pass = emailInput > 0 && enterButton > 0 && googleButton > 0;
    results.push({ name: "Test 1: Login page has email, Entrar, Google button", pass: test1Pass });
    console.log(`  RESULT: ${test1Pass ? "PASS" : "FAIL"}`);

    // TEST 2: Navbar shows "Entrar" when not logged in
    console.log("\n=== TEST 2: Navbar shows Entrar when not logged in ===");
    await page.goto(`${BASE_URL}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const entrarNavLink = await page.locator('a[href="/login"]').count();
    const entrarText = await page.locator('header').locator('text=Entrar').count();

    console.log(`  Login link in header: ${entrarNavLink}`);
    console.log(`  Entrar text in header: ${entrarText}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test2-navbar-logged-out.png`, fullPage: false });

    const test2Pass = entrarNavLink > 0 && entrarText > 0;
    results.push({ name: "Test 2: Navbar shows Entrar when not logged in", pass: test2Pass });
    console.log(`  RESULT: ${test2Pass ? "PASS" : "FAIL"}`);

    // TEST 3: Fake login works
    console.log("\n=== TEST 3: Fake login with victor@test.com ===");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    await page.locator('input[type="email"]').fill("victor@test.com");
    console.log(`  Typed: victor@test.com`);

    await page.locator('button[type="submit"]').click();
    console.log(`  Clicked Entrar`);

    await page.waitForTimeout(2500);

    const urlAfterLogin = page.url();
    const redirectedToHome = !urlAfterLogin.includes("/login");
    console.log(`  URL after login: ${urlAfterLogin}`);
    console.log(`  Redirected away from /login: ${redirectedToHome}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test3-after-login.png`, fullPage: false });

    const test3Pass = redirectedToHome;
    results.push({ name: "Test 3: Login redirects to home", pass: test3Pass });
    console.log(`  RESULT: ${test3Pass ? "PASS" : "FAIL"}`);

    // TEST 4: Logged-in navbar
    console.log("\n=== TEST 4: Logged-in navbar shows user info and logged-in links ===");

    // User button should be visible (Button[1] was "VVictor")
    const userButtonText = await page.locator('header button').filter({ has: page.locator('.rounded-full') }).textContent().catch(() => "");
    const reelsLink = await page.locator('a[href="/reels"]').count();
    const favoritosLink = await page.locator('a[href="/favoritos"]').count();
    const alertasLink = await page.locator('a[href="/alertas"]').count();
    const loginLinkGone = await page.locator('a[href="/login"]').count();

    console.log(`  User button text: "${userButtonText?.trim()}"`);
    console.log(`  Reels link: ${reelsLink > 0 ? "VISIBLE" : "NOT VISIBLE"}`);
    console.log(`  Favoritos link: ${favoritosLink > 0 ? "VISIBLE" : "NOT VISIBLE"}`);
    console.log(`  Alertas link: ${alertasLink > 0 ? "VISIBLE" : "NOT VISIBLE"}`);
    console.log(`  Login link gone: ${loginLinkGone === 0}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test4-navbar-logged-in.png`, fullPage: false });

    const test4Pass = (reelsLink > 0 || favoritosLink > 0 || alertasLink > 0) && loginLinkGone === 0;
    results.push({ name: "Test 4: Logged-in navbar shows user links, no Entrar", pass: test4Pass });
    console.log(`  RESULT: ${test4Pass ? "PASS" : "FAIL"}`);

    // TEST 5: Logout
    console.log("\n=== TEST 5: Logout ===");

    // Click the user avatar button (the one containing .rounded-full)
    const userAvatarBtn = page.locator('header button').filter({ has: page.locator('.rounded-full') });
    await userAvatarBtn.first().click();
    console.log(`  Clicked user avatar to open dropdown`);
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test5-dropdown-open.png`, fullPage: false });

    const sairBtn = page.locator('text=Sair');
    const sairCount = await sairBtn.count();
    console.log(`  Sair button in dropdown: ${sairCount > 0 ? "FOUND" : "NOT FOUND"}`);

    if (sairCount > 0) {
      await sairBtn.first().click();
      console.log(`  Clicked Sair`);
    }

    await page.waitForTimeout(1500);

    const entrarBackAfterLogout = await page.locator('header').locator('text=Entrar').count();
    const loginLinkBack = await page.locator('a[href="/login"]').count();
    console.log(`  Entrar text back in header: ${entrarBackAfterLogout > 0}`);
    console.log(`  Login link back: ${loginLinkBack > 0}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test5-after-logout.png`, fullPage: false });

    const test5Pass = entrarBackAfterLogout > 0 && loginLinkBack > 0;
    results.push({ name: "Test 5: Logout restores Entrar button", pass: test5Pass });
    console.log(`  RESULT: ${test5Pass ? "PASS" : "FAIL"}`);

    // Extra: Google button shows "em breve" message
    console.log("\n=== TEST 6 (Bonus): Google button shows em breve message ===");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const googleBtn = page.locator('button:has-text("Entrar com Google")');
    await googleBtn.click();
    await page.waitForTimeout(600);

    const emBreveMsg = await page.locator('text=Em breve').count();
    console.log(`  Em breve message shown: ${emBreveMsg > 0}`);

    await page.screenshot({ path: `${EVIDENCE_DIR}/test6-google-em-breve.png`, fullPage: false });

    results.push({ name: "Test 6: Google button shows em breve", pass: emBreveMsg > 0 });
    console.log(`  RESULT: ${emBreveMsg > 0 ? "PASS" : "FAIL"}`);

  } catch (err) {
    console.error("Test error:", err);
    results.push({ name: "Error", pass: false, error: err.message });
  } finally {
    await browser.close();
  }

  // Summary
  console.log("\n=== FINAL TEST SUMMARY ===");
  let allPass = true;
  for (const r of results) {
    console.log(`  ${r.pass ? "PASS" : "FAIL"}: ${r.name}`);
    if (!r.pass) allPass = false;
  }
  const passCount = results.filter(r => r.pass).length;
  console.log(`\nOVERALL: ${allPass ? "PASS" : "FAIL"} (${passCount}/${results.length} passed)`);

  return { results, allPass, passCount, total: results.length };
}

runTests().catch(console.error);
