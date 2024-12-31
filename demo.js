const puppeteer = require('puppeteer');
const Scorecard = require('./models/scorecard');
const Team = require('./models/team');  // Import Team model
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

// Connect to MongoDB
mongoose.connect("mongodb+srv://pratap11191:XwmG3rC43LiJkRUM@cluster0.41bnq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log('Connected to cricdata database'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

mongoose.set('bufferTimeoutMS', 30000);  

const scrapeMatchData = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });


  const allScorecards = await page.evaluate(async () => {
    const tables = document.querySelectorAll('.statistic-table');
    const heading = document.querySelector('.large-heading');

    if (!heading) throw new Error("Heading not found!");

    let team1 = heading.querySelector('span:first-child')?.textContent.trim() || "Unknown";
    const team1Abbr = heading.querySelector('span:first-child > .abbr-tag > span')?.textContent.trim() || "UNK";
    let team2 = heading.querySelector('span:nth-child(3)')?.textContent.trim() || "Unknown";
    const team2Abbr = heading.querySelector('span:nth-child(3) > .abbr-tag > span')?.textContent.trim() || "UNK";

    team1 = team1.split(' ').filter(word => word.toLowerCase() !== team1Abbr.toLowerCase()).join(' ');
    team2 = team2.split(' ').filter(word => word.toLowerCase() !== team2Abbr.toLowerCase()).join(' ');

    const matchInfoText = heading.querySelector('.comp-sub-title')?.textContent.trim() || "Unknown";
      const matchInfoSplit = matchInfoText.split("—");
      const matchDate = matchInfoSplit[1]?.trim() || "Unknown Date";
      const matchInfoSplit2 = matchInfoSplit[0]?.split("•") || ["Unknown League", "Unknown Venue"];
      const league = matchInfoSplit2[0]?.trim() || "Unknown League";
      const venue = matchInfoSplit2[1]?.trim() || "Unknown Venue";
    const allData = await Promise.all(
      Array.from(tables).map(async (table, index) => {
        const header = [];
        const tableData = [];
        let remark = "Bowling";

        table.querySelectorAll('thead tr').forEach(row => {
          row.querySelectorAll('th').forEach(col => {
            header.push(col?.textContent.trim());
            if (col?.textContent.trim() === "Batsman") remark = "Batting";
          });
        });

        table.querySelectorAll('tbody tr').forEach(row => {
          const columns = row.querySelectorAll('td');
          if (columns.length >= 3) {
            const temp = {};
            columns.forEach((col, colIndex) => temp[header[colIndex]] = col.textContent.trim());
            tableData.push(temp);
          }
        });

        const innings = (index === 0 || index === 2) ? "1st innings" : "2nd innings";
        return { innings: `${innings} ${remark}`, data: tableData };
      })
    );

    return { matchInfo: { team1, team1Abbr, team2, team2Abbr, matchDate, league, venue }, scoreCard: allData.filter(item => item.data.length > 0) };
  });

  await browser.close();
  return allScorecards;
};


const insertScorecard = async (url) => {
  const matchId = url.split('/').pop();

  if (!url) {
    console.log({ success: false, error: 'No URL provided.' });
  }

  try {
    const allScorecards = await scrapeMatchData(url);

    await Scorecard.updateOne({ matchId: matchId }, allScorecards, { upsert: true });

    console.log('Match data saved successfully.');

    
  } catch (error) {
    console.error('Error scraping scorecards:', error.message);
   
  }
};


(async () => {
  const pLimit = await import('p-limit').then((mod) => mod.default);

  const fileContent = fs.readFileSync('scorecard_links.json', 'utf8');
  const scorecardLinks = JSON.parse(fileContent);

  const limit = pLimit(5); // Limit to 5 concurrent promises
  const tasks = scorecardLinks.map((link) => limit(() => insertScorecard(link)));

  await Promise.all(tasks);
  console.log('All scorecards processed successfully.');
  mongoose.connection.close();
})();
