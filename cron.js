const express = require('express');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const Team = require('./team');  // Import Team model

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve static files like index.html

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Scrape and store international teams in the database
app.get('/scrapeTeams', async (req, res) => {
  const url = 'http://bigbashboard.com/teams/at20c';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  try {
    // Scrape the team names from the page
    const teams = await page.evaluate(() => {
      const teamElements = document.querySelectorAll('.statistic-table tbody tr'); // Update the selector as per the page structure
      
      const typeteam = document.querySelector('.comp-sub-title strong').textContent.trim();
      const teamNames = [];

      teamElements.forEach(row => {
        const firstColumn = row.querySelector('td'); // Get the first <td> of the row
        if (firstColumn) {
          console.log("..... ", firstColumn.textContent.trim());
          teamNames.push({ name: firstColumn.textContent.trim(), type: typeteam });
        }
      });
      return teamNames;
    });

    if (teams.length > 0) {
        console.log(teams);
    //   Store each team in the database
    //   const promises = teams.map(team => {
    //     return Team.create(team);
    //   });

    // //   Wait for all team inserts to complete
    //   await Promise.all(promises);
      res.json({ success: true, message: 'Teams stored successfully', teams: teams });
    } else {
      res.status(404).json({ success: false, message: 'No teams found on the page' });
    }
  } catch (error) {
    console.error('Error scraping teams:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await browser.close();
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});