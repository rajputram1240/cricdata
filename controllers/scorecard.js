const Scorecard = require('../models/scorecard');
const { scrapeMatchData } = require('../utils/puppeteer');

// Insert a new scorecard
const insertScorecard = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'No URL provided.' });

  try {
    const scorecardData = await scrapeMatchData(url);
    await Scorecard.updateOne({ matchId: scorecardData.matchId }, scorecardData, { upsert: true });
    res.json({ success: true, message: 'Scorecard saved successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Fetch head-to-head match data
const getHeadToHead = async (req, res) => {
  const { team1, team2 } = req.query;
  if (!team1 || !team2) return res.status(400).json({ success: false, error: 'Please provide both team names.' });

  try {
    const matches = await Scorecard.find({
      $or: [
        { "matchInfo.team1": team1, "matchInfo.team2": team2 },
        { "matchInfo.team1": team2, "matchInfo.team2": team1 },
      ]
    });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Fetch match details by ID
const getMatchDetails = async (req, res) => {
  const { matchId } = req.query;
  if (!matchId) return res.status(400).json({ error: 'Match ID is required' });

  try {
    const match = await Scorecard.findById(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
};

module.exports = { insertScorecard, getHeadToHead, getMatchDetails };