const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // Launch Puppeteer browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.goto("http://bigbashboard.com/matches/2025", { waitUntil: 'domcontentloaded' });

    // Evaluate the page to extract the href linksss
    const scorecardLinks = await page.evaluate(() => {
      const links = [];
      const elements = document.querySelectorAll('.fixture-sc a[data-tip="View Scorecard"]');
      elements.forEach(el => {
        links.push(el.href); // Use `el.getAttribute('href')` if testing local HTML
      });
      return links;
    });

    console.log('Scorecard Links:', scorecardLinks);

    // Save URLs to a file
    fs.writeFileSync('scorecard_links.json', JSON.stringify(scorecardLinks, null, 2), 'utf8');
    console.log('Scorecard links have been saved to scorecard_links.json');
  } catch (error) {
    console.error('Error occurred:', error.message);
  } finally {
    // Close the browser
    await browser.close();
  }
})();