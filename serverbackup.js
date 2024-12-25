const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const Scorecard = require('./scorecard');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve static files like index.html

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/cricdata', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to cricdata database'))
  .catch(err => console.error('Failed to connect to MongoDB', err));


app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'No URL provided.' });
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to the webpage
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for the necessary elements to load
    await page.waitForSelector('.statistic-table', { timeout: 10000 });
    await page.waitForSelector('.large-heading', { timeout: 10000 });

    // Extract data
    const allScorecards = await page.evaluate(() => {
      const tables = document.querySelectorAll('.statistic-table');
      const allData = [];
      let titleIndex = 0;

      // Extract match information
      const heading = document.querySelector('.large-heading');
      if (!heading) throw new Error("Heading not found!");

      let team1 = heading.querySelector('span:first-child')?.textContent.trim() || "Unknown";
      team1 = team1.split(" ")[0].trim();
      const team1Abbr = heading.querySelector('span:first-child > .abbr-tag > span')?.textContent.trim() || "UNK";
      let team2 = heading.querySelector('span:nth-child(3)')?.textContent.trim() || "Unknown";
      team2 = team2.split(" ")[1].trim();
      const team2Abbr = heading.querySelector('span:nth-child(3) > .abbr-tag > span')?.textContent.trim() || "UNK";
      const matchInfoText = heading.querySelector('.comp-sub-title')?.textContent.trim() || "Unknown";
      const matchInfoSplit = matchInfoText.split("—");
      const matchDate = matchInfoSplit[1]?.trim() || "Unknown Date";
      const matchInfoSplit2 = matchInfoSplit[0]?.split("•") || ["Unknown League", "Unknown Venue"];
      const league = matchInfoSplit2[0]?.trim() || "Unknown League";
      const venue = matchInfoSplit2[1]?.trim() || "Unknown Venue";

      // Loop through each table to extract data
      tables.forEach((table, index) => {
        const head = table.querySelectorAll('thead tr');
        const rows = table.querySelectorAll('tbody tr');
        const header = [];
        const tableData = [];
        let remark = "Bowling";
        titleIndex++;

        // Extract header row
        head.forEach(row => {
          const columns = row.querySelectorAll('th');
          if (columns.length < 3) return;
          columns.forEach(col => {
            header.push(col?.textContent.trim());
            if (col?.textContent.trim() === "Batsman") {
              remark = "Batting";
            }
          });
        });

        // Extract row data
        rows.forEach(row => {
          const columns = row.querySelectorAll('td');
          if (columns.length < 3) return;
          const temp = {};
          columns.forEach((col, colIndex) => {
            temp[header[colIndex]] = col.textContent.trim();
          });
          tableData.push(temp);
        });

        const innings = (titleIndex === 1 || titleIndex === 3) ? "1st innings" : "2nd innings";
        const inningsType = `${innings} ${remark}`;

        allData.push({
          innings: inningsType,
          data: tableData,
        });
      });

      return {
        matchInfo: { team1, team1Abbr, team2, team2Abbr, matchDate, league, venue },
        scoreCard: allData.filter(item => item.data.length > 0),
      };
    });

    // Create folder with league name if it doesn't exist
    const leagueFolder = path.join(__dirname , allScorecards.matchInfo.league);
    if (!fs.existsSync(leagueFolder)) {
      fs.mkdirSync(leagueFolder, { recursive: true });  // Create the folder if it doesn't exist
    }

    // Define filename dynamically
    const filename = `${allScorecards.matchInfo.league}_${allScorecards.matchInfo.team1}_vs_${allScorecards.matchInfo.team2}_${allScorecards.matchInfo.matchDate.replace(/\s/g, '_')}.json`;
    const filePath = path.join(leagueFolder, filename);
        
    // Check if the file already exists
    if (fs.existsSync(filePath)) {
      console.log(`File already saved: ${filePath}`);
      res.status(500).json({ success: false, error: 'File already saved.' });
    } else {
      // Save the data to a JSON file in the league folder
      fs.writeFileSync(filePath, JSON.stringify(allScorecards, null, 2));

      console.log(`Scorecards saved to ${filePath}`);
      res.json({ success: true, filename: filename });
    }
  } catch (error) {
    console.error('Error scraping scorecards:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await browser.close();
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});