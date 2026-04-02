import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  // STEP 1: Check /imoveis for the new property and its image
  await page.goto('http://localhost:3000/imoveis');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-6-imoveis-list.png', fullPage: true });
  
  const cards = await page.locator('[class*="card"], .property-card').count();
  console.log(`Cards on imoveis page: ${cards}`);
  
  // Check for the property we just created
  const ourProperty = await page.locator('text=Casa Teste Upload Playwright').count();
  console.log(`Our test property found: ${ourProperty}`);
  
  // Check if any images are showing
  const cardImages = await page.locator('img').count();
  console.log(`Images on imoveis page: ${cardImages}`);
  
  // Check image sources
  const imgSrcs = await page.$$eval('img', imgs => imgs.map(i => i.src).slice(0, 5));
  console.log('Image sources (first 5):', imgSrcs);
  
  // Find the newly created property link
  const propertyLinks = await page.$$eval('a[href*="/imoveis/"]', links => links.map(l => l.href));
  console.log('Property links found:', propertyLinks.length);
  
  // Get the newest property ID
  // Navigate to the last property
  if (propertyLinks.length > 0) {
    // Sort to get most recent - check the last few
    const recentLinks = propertyLinks.slice(-3);
    console.log('Recent links:', recentLinks);
    
    // Find the one with our property
    for (const link of recentLinks) {
      const propId = link.match(/\/imoveis\/(\d+)/)?.[1];
      if (propId) {
        await page.goto(link);
        await page.waitForLoadState('networkidle');
        const titleText = await page.locator('h1').first().textContent().catch(() => '');
        console.log(`Property ${propId} title:`, titleText);
        if (titleText.includes('Casa Teste Upload')) {
          console.log('Found our property!');
          await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-7-detail-page.png', fullPage: true });
          
          // Check for gallery images
          const galleryImgs = await page.locator('img').count();
          console.log('Images on detail page:', galleryImgs);
          
          const imgSrcsDetail = await page.$$eval('img', imgs => imgs.map(i => ({src: i.src, alt: i.alt})));
          console.log('Detail page images:', JSON.stringify(imgSrcsDetail, null, 2));
          break;
        }
      }
    }
  }
  
} catch (err) {
  console.error('Error:', err.message);
  await page.screenshot({ path: 'C:/rasa/workspaces/imovel-facil/.sprintfy/evidence/f8-verify-error.png', fullPage: true });
} finally {
  await browser.close();
}
