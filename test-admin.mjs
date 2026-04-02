import { chromium } from 'playwright';

const evidenceDir = '/c/rasa/workspaces/imovel-facil/.sprintfy/evidence';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

// Test Feature #7: Admin List
console.log('=== Testing Feature #7: Admin List ===');
await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${evidenceDir}/admin-list-1.png`, fullPage: true });
console.log('Screenshot taken: admin-list-1.png');

const title = await page.textContent('h1');
console.log('Title:', title);

const hasNovoImovel = await page.locator('text=Novo Im').first().isVisible().catch(() => false);
console.log('Novo Imovel button visible:', hasNovoImovel);

const propertyCards = await page.locator('[data-slot="card"]').count();
console.log('Property cards count:', propertyCards);

const propertyTitles = await page.locator('h3').allTextContents();
console.log('Property titles:', JSON.stringify(propertyTitles));

const activeBadges = await page.locator('text=Ativo').count();
console.log('Active badges:', activeBadges);

// Check for action icon buttons
const eyeBtn = await page.locator('svg.lucide-eye').count();
const toggleBtn = await page.locator('svg.lucide-toggle-right, svg.lucide-toggle-left').count();
const editBtn = await page.locator('svg.lucide-edit').count();
const deleteBtn = await page.locator('svg.lucide-trash2').count();
console.log('Eye buttons:', eyeBtn, 'Toggle buttons:', toggleBtn, 'Edit buttons:', editBtn, 'Delete buttons:', deleteBtn);

// Screenshot after scroll
await page.evaluate(() => window.scrollTo(0, 200));
await page.screenshot({ path: `${evidenceDir}/admin-list-2.png`, fullPage: false });
console.log('Screenshot taken: admin-list-2.png');

// Test Feature #6: Admin Registration  
console.log('\n=== Testing Feature #6: Admin Registration ===');
await page.goto('http://localhost:3000/admin/cadastro', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${evidenceDir}/admin-cadastro-1.png`, fullPage: true });
console.log('Screenshot taken: admin-cadastro-1.png');

const formTitle = await page.textContent('h1');
console.log('Form title:', formTitle);

// Check form fields
const allInputs = await page.locator('input').count();
const allTextareas = await page.locator('textarea').count();
const allSelects = await page.locator('[role="combobox"]').count();
console.log('Inputs:', allInputs, 'Textareas:', allTextareas, 'Selects:', allSelects);

// Get all input names/placeholders
const inputs = await page.locator('input').evaluateAll(inputs => 
  inputs.map(i => ({ name: i.name, placeholder: i.placeholder, type: i.type }))
);
console.log('Input details:', JSON.stringify(inputs));

// Fill in title
await page.locator('input[name="title"]').fill('Casa Teste').catch(async () => {
  const inputs = await page.locator('input[type="text"]').all();
  if (inputs.length > 0) await inputs[0].fill('Casa Teste');
});

// Fill textarea
await page.locator('textarea').first().fill('Casa de teste').catch(() => console.log('No textarea found'));

// Take screenshot of filled form
await page.screenshot({ path: `${evidenceDir}/admin-cadastro-2.png`, fullPage: true });
console.log('Screenshot taken: admin-cadastro-2.png');

// Scroll to middle
await page.evaluate(() => window.scrollTo(0, 500));
await page.screenshot({ path: `${evidenceDir}/admin-cadastro-3.png`, fullPage: false });
console.log('Screenshot taken: admin-cadastro-3.png');

await browser.close();
console.log('\nDone!');
