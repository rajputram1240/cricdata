const express = require('express');
const { scrapeTeams, getLeagueTeams, getLeagues, getVenues, getMatchesByVenue } = require('../controllers/team');

const router = express.Router();

// Define endpoints
router.post('/scrape', scrapeTeams);
router.get('/league-teams', getLeagueTeams);
router.get('/leagues', getLeagues);
router.get('/venues', getVenues);
router.get('/matches-by-venue', getMatchesByVenue);

module.exports = router;