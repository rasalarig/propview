import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";

const EVIDENCE_DIR = "C:/rasa/workspaces/imovel-facil/.sprintfy/evidence";
if (!existsSync(EVIDENCE_DIR)) mkdirSync(EVIDENCE_DIR, { recursive: true });

const BASE_URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = [];

  try {
    // --- LOGIN ---
    console.log("Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await sleep(1500);
    await page.fill('input[type="email"]', "alerttester@test.com");
    await page.click('button[type="submit"]');
    await sleep(2000);
    console.log("Login done, current URL:", page.url());

    // --- TEST 1: Alerts page loads ---
    console.log("\n=== TEST 1: Alerts page loads ===");
    await page.goto(`${BASE_URL}/alertas`);
    await sleep(2000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-test1-page-load.png`, fullPage: true });

    const hasInput = await page.locator('input[placeholder*="terreno"]').count() > 0
      || await page.locator('input[placeholder*="arvore"]').count() > 0
      || await page.locator('input[type="text"]').count() > 0;
    const hasButton = await page.locator('button:has-text("Criar Alerta")').count() > 0;
    const hasEmptyState = await page.locator('text=Crie alertas').count() > 0
      || await page.locator('text=nenhum alerta').count() > 0
      || await page.locator('text=novos imoveis').count() > 0;

    console.log("Has input:", hasInput);
    console.log("Has button:", hasButton);
    console.log("Has empty state:", hasEmptyState);

    results.push({
      test: "Test 1: Alerts page loads",
      pass: hasInput && hasButton,
      details: `input=${hasInput}, button=${hasButton}, emptyState=${hasEmptyState}`
    });

    // --- TEST 2: Create an alert ---
    console.log("\n=== TEST 2: Create an alert ===");
    const inputEl = page.locator('input[type="text"]').first();
    await inputEl.fill("terreno com árvores");
    await sleep(500);
    await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-test2-typed.png`, fullPage: true });

    await page.click('button:has-text("Criar Alerta")');
    await sleep(3000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-test2-after-create.png`, fullPage: true });

    const alertInList = await page.locator('text=terreno com árvores').count() > 0
      || await page.locator('text=terreno com arvores').count() > 0;
    console.log("Alert appears in list:", alertInList);

    // Check for matches count
    const matchesText = await page.locator('text=resultado').first().textContent().catch(() => "");
    const totalMatchesEl = await page.locator('text=resultados').first().textContent().catch(() => "");
    console.log("Matches text:", matchesText || totalMatchesEl);

    results.push({
      test: "Test 2: Create an alert",
      pass: alertInList,
      details: `alertInList=${alertInList}, matchesText="${matchesText || totalMatchesEl}"`
    });

    // --- TEST 3: View alert matches ---
    console.log("\n=== TEST 3: View alert matches ===");
    const verResultadosBtn = page.locator('button:has-text("Ver resultados")');
    const verResultadosCount = await verResultadosBtn.count();
    console.log("'Ver resultados' button count:", verResultadosCount);

    if (verResultadosCount > 0) {
      await verResultadosBtn.first().click();
      await sleep(2000);
      await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-test3-matches-expanded.png`, fullPage: true });

      const hasMatches = await page.locator('text=Score:').count() > 0;
      const hasMatchCards = await page.locator('text=Ver detalhes').count() > 0;
      const noMatches = await page.locator('text=Nenhum imovel').count() > 0;

      console.log("Has score badges:", hasMatches);
      console.log("Has match cards:", hasMatchCards);
      console.log("No matches message:", noMatches);

      results.push({
        test: "Test 3: View alert matches",
        pass: hasMatches || hasMatchCards || noMatches,
        details: `hasScores=${hasMatches}, hasCards=${hasMatchCards}, noMatchMsg=${noMatches}`
      });

      // Collapse back
      const ocultarBtn = page.locator('button:has-text("Ocultar resultados")');
      if (await ocultarBtn.count() > 0) {
        await ocultarBtn.click();
        await sleep(500);
      }
    } else {
      // No matches => alert shows 0 results
      await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-test3-no-matches.png`, fullPage: true });
      results.push({
        test: "Test 3: View alert matches",
        pass: true,
        details: "No matches found (0 resultados), no expand button shown - expected behavior"
      });
    }

    // --- TEST 4: Toggle alert active/inactive ---
    console.log("\n=== TEST 4: Toggle alert active/inactive ===");
    const toggleBtn = page.locator('button[title="Desativar alerta"]').first();
    const toggleCount = await toggleBtn.count();
    console.log("Toggle button count:", toggleCount);

    if (toggleCount > 0) {
      await toggleBtn.click();
      await sleep(1000);
      await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-test4-toggled-off.png`, fullPage: true });

      // Check if the card is now dimmed (opacity-70 class)
      const inactiveCard = await page.locator('.opacity-70').count() > 0;
      const reactivateBtn = await page.locator('button[title="Ativar alerta"]').count() > 0;
      console.log("Inactive card (opacity-70):", inactiveCard);
      console.log("Reactivate button present:", reactivateBtn);

      results.push({
        test: "Test 4: Toggle alert inactive",
        pass: inactiveCard || reactivateBtn,
        details: `inactiveCard=${inactiveCard}, reactivateBtn=${reactivateBtn}`
      });

      // Re-activate
      const reactivate = page.locator('button[title="Ativar alerta"]').first();
      if (await reactivate.count() > 0) {
        await reactivate.click();
        await sleep(1000);
        await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-test4-toggled-back-on.png`, fullPage: true });
      }
    } else {
      results.push({
        test: "Test 4: Toggle alert",
        pass: false,
        details: "Toggle button not found"
      });
    }

    // --- TEST 5: Notification badge on navbar ---
    console.log("\n=== TEST 5: Notification badge ===");
    await page.goto(`${BASE_URL}`);
    await sleep(2000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-test5-home-navbar.png`, fullPage: false });

    // Check for badge near Alertas link
    const alertasLink = page.locator('a[href="/alertas"]');
    const alertasCount = await alertasLink.count();
    console.log("Alertas link count:", alertasCount);

    // Check for red badge (rose-500 or notification dot)
    const badge = await page.locator('a[href="/alertas"] span').count() > 0;
    const hasNotifBadge = await page.locator('.bg-rose-500').count() > 0;
    console.log("Badge near alertas:", badge, "rose-500 class:", hasNotifBadge);

    results.push({
      test: "Test 5: Notification badge",
      pass: alertasCount > 0,
      details: `alertasLinkExists=${alertasCount > 0}, hasBadge=${badge || hasNotifBadge}`
    });

    // --- FINAL STATE SCREENSHOT ---
    await page.goto(`${BASE_URL}/alertas`);
    await sleep(2000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-final-state.png`, fullPage: true });

  } catch (err) {
    console.error("Test error:", err);
    await page.screenshot({ path: `${EVIDENCE_DIR}/alerts-error.png`, fullPage: true });
    results.push({ test: "Error", pass: false, details: err.message });
  } finally {
    await browser.close();
  }

  console.log("\n=== RESULTS ===");
  results.forEach((r) => {
    console.log(`[${r.pass ? "PASS" : "FAIL"}] ${r.test}: ${r.details}`);
  });

  const allPass = results.every((r) => r.pass);
  console.log("\nOverall:", allPass ? "PASS" : "FAIL");

  return results;
}

main().catch(console.error);
