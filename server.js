const express = require('express');
const puppeteer = require('puppeteer');
const Scorecard = require('./scorecard');
const Team = require('./team');  // Import Team model
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve static files like index.html

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to cricdata database'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Helper function to launch puppeteer and scrape data
const scrapeMatchData = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const matchId = url.split('/').pop();

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
    const [matchDate, league, venue] = matchInfoText.split("—")[1]?.trim().split("•") || ["Unknown Date", "Unknown League", "Unknown Venue"];

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

    return { matchId, matchInfo: { team1, team1Abbr, team2, team2Abbr, matchDate, league, venue }, scoreCard: allData.filter(item => item.data.length > 0) };
  });

  await browser.close();
  return allScorecards;
};

// Insert Scorecard Endpoint
app.post('/insertScorecard', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'No URL provided.' });
  }

  try {
    const allScorecards = await scrapeMatchData(url);

    await Scorecard.updateOne({ matchId: allScorecards.matchId }, allScorecards, { upsert: true });

    res.json({ success: true, message: 'Match data saved successfully.' });
  } catch (error) {
    console.error('Error scraping scorecards:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scrape and store international teams in the database
app.post('/scrapeTeams', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'No URL provided.' });
  }

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
          teamNames.push({ name: firstColumn.textContent.trim(), type: typeteam });
        }
      });
      return teamNames;
    });

    if (teams.length > 0) {
      const results = [];
      
      // Iterate over teams and insert only if not already in database
      for (const team of teams) {
        const existingTeam = await Team.findOne({ where: { name: team.name, type: team.type } });
        
        if (!existingTeam) {
          const newTeam = await Team.create(team);
          results.push(newTeam);
        }
      }

      res.json({
        success: true,
        message: 'Teams processed successfully',
        stored: results.length,
        skipped: teams.length - results.length,
        teams: results
      });
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


// Get All League Teams Endpoint
app.get('/getAllLeagueTeam', async (req, res) => {
  const { league } = req.query;

  if (!league) {
    return res.status(400).json({ success: false, error: 'Please select league name.' });
  }

  try {
    const result = await Team.find({ "type": league }).select('name -_id');
    
    // Extract names into an array
    const resultSet = result.map(team => team.name);

    if (resultSet.length > 0) {
      res.json(resultSet);
    } else {
      res.status(400).json({ success: false, error: 'No matches found.' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Head-to-Head Matches Endpoint
app.get('/head2head', async (req, res) => {
  const { team1, team2 } = req.query;

  if (!team1 || !team2) {
    return res.status(400).json({ success: false, error: 'Please select team' });
  }

  try {
    const matches = await Scorecard.find({
      $or: [
        { "matchInfo.team1": team1, "matchInfo.team2": team2 },
        { "matchInfo.team1": team2, "matchInfo.team2": team1 },
      ]
    });

    res.json(matches);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get Unique league Endpoint
app.get('/league', async (req, res) => {
  try {
    const league = await Team.distinct("type");
    res.json(league);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get Unique Venues Endpoint
app.get('/venue', async (req, res) => {
  try {
    const venues = await Scorecard.distinct("matchInfo.venue");
    res.json(venues);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get Matches By Venue Endpoint
app.get('/matchByVenue', async (req, res) => {
  const { venue } = req.query;

  if (!venue) {
    return res.status(400).json({ success: false, error: 'Please select venue' });
  }

  try {
    const matches = await Scorecard.find({ "matchInfo.venue": venue });
    res.json(matches);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get Match Details by matchId Endpoint
app.get('/matchDetails', async (req, res) => {
  const matchId = req.query.matchId;

  if (!matchId) {
    return res.status(400).json({ error: 'Match ID is required' });
  }

  try {
    const match = await Scorecard.findById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(match);
  } catch (error) {
    console.error('Error fetching match details:', error);
    res.status(500).json({ error: 'An error occurred while fetching match details' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});