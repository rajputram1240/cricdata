const Team = require('../models/team');

// Scrape and store team data
const scrapeTeams = async (req, res) => {
  // Logic for scraping teams
};

// Get teams by league
const getLeagueTeams = async (req, res) => {
  const { league } = req.query;
  if (!league) return res.status(400).json({ success: false, error: 'League name is required.' });

  try {
    const teams = await Team.find({ type: league }).select('name -_id');
    res.json(teams.map(team => team.name));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Fetch unique leagues
const getLeagues = async (req, res) => {
  try {
    const leagues = await Team.distinct('type');
    res.json(leagues);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Fetch unique venues
const getVenues = async (req, res) => {
  try {
    const venues = await Scorecard.distinct('matchInfo.venue');
    res.json(venues);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Fetch matches by venue
const getMatchesByVenue = async (req, res) => {
  const { venue } = req.query;
  if (!venue) return res.status(400).json({ success: false, error: 'Venue is required.' });

  try {
    const matches = await Scorecard.find({ "matchInfo.venue": venue });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { scrapeTeams, getLeagueTeams, getLeagues, getVenues, getMatchesByVenue };