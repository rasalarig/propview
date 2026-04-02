const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleMessages.push({ type: 'pageerror', text: err.toString() }));

  console.log('Navigating to homepage...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/css-home.png', fullPage: true });
  console.log('Homepage screenshot taken');

  const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  console.log('Body background color:', bgColor);

  const cssVars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      background: style.getPropertyValue('--background').trim(),
      foreground: style.getPropertyValue('--foreground').trim(),
      primary: style.getPropertyValue('--primary').trim(),
    };
  });
  console.log('CSS variables:', JSON.stringify(cssVars));

  console.log('\nNavigating to /imoveis...');
  await page.goto('http://localhost:3000/imoveis', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/css-imoveis.png', fullPage: true });
  
  const imoveisBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  console.log('Imoveis body bg:', imoveisBg);

  console.log('\nNavigating to /busca...');
  await page.goto('http://localhost:3000/busca', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/css-busca.png', fullPage: true });

  const buscaBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  console.log('Busca body bg:', buscaBg);

  console.log('\nNavigating to /admin...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/css-admin.png', fullPage: true });

  const adminBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  console.log('Admin body bg:', adminBg);

  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach(msg => console.log(`[${msg.type}] ${msg.text}`));

  const stylesheets = await page.evaluate(() => {
    return Array.from(document.styleSheets).map(ss => {
      try { return { href: ss.href, rules: ss.cssRules?.length }; }
      catch(e) { return { href: ss.href, error: e.message }; }
    });
  });
  console.log('\n=== LOADED STYLESHEETS ===');
  console.log(JSON.stringify(stylesheets, null, 2));

  await browser.close();
  console.log('\nDone!');
})();
