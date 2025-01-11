const express = require('express');
const router = express.Router();
const Scorecard = require('../models/scorecard');
const Team = require("../models/team");

async function getPlayersWithRuns(scorecard, inningsIndex) {
  if (!scorecard[inningsIndex] || !scorecard[inningsIndex].data) {
      console.error(`Invalid or missing data at innings index ${inningsIndex}`);
      return [];
  }

  const players = scorecard[inningsIndex].data
      .filter(player => parseInt(player.R) >= 20)
      .map(player => ({
          name: player.Batsman.split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toUpperCase())
          .join(' '),
          runs: player.R,
          balls: player.Balls,
      }));

  return players;
}

async function getBowlersWithWickets(scorecard, inningsIndex) {
  if (!scorecard[inningsIndex] || !scorecard[inningsIndex].data) {
      console.error(`Invalid or missing data at innings index ${inningsIndex}`);
      return [];
  }

  const players = scorecard[inningsIndex].data
      .filter(player => parseInt(player.W) >= 1)
      .map(player => ({
          name: player.Bowler.split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toUpperCase())
          .join(' '),
          over: player.O,
          wicket: player.W,
      }));

  return players;
}


router.get('/h2h',async (req,res)=> {
    const leagues = await Team.distinct("type");
    res.render('h2h',{
      title: 'Head to head',
      activePage: "head2head",
      leagues,
      matches: []
    });
  })
  
  router.get('/head2head', async (req, res) => {
    const { team1, team2 } = req.query;
  
    // Validation for missing teams
    if (!team1 || !team2) {
      return res.status(400).json({ success: false, error: 'Please select both teams' });
    }
  
    try {
        // Find matches where both teams played
        const matches = await Scorecard.find({
            $or: [
                { "matchInfo.team1": team1, "matchInfo.team2": team2 },
                { "matchInfo.team1": team2, "matchInfo.team2": team1 },
            ]
        });
       
        let modifiedMatches1 = [];

        // Process each match asynchronously
        const modifiedMatches = await Promise.all(matches.map(async (match) => {
            const inningsPromises = [
                getPlayersWithRuns(match.scoreCard, 0), // 1st innings batting
                getPlayersWithRuns(match.scoreCard, 2), // 2nd innings batting
                getBowlersWithWickets(match.scoreCard, 1), // 1st innings bowling
                getBowlersWithWickets(match.scoreCard, 3)  // 2nd innings bowling
            ];

            const [
                playersWithRuns1, 
                playersWithRuns2, 
                playersWithWickets1, 
                playersWithWickets2
            ] = await Promise.all(inningsPromises);
            
            modifiedMatches1.push({
              batting: {
                  "1st innings": playersWithRuns1,
                  "2nd innings": playersWithRuns2
              },
              bowling: {
                  "1st innings": playersWithWickets1,
                  "2nd innings": playersWithWickets2
              }
          });
            return match;
        }));
        // Send response with the modified matches

        console.log({modifiedMatches,modifiedMatches1});
        res.json({modifiedMatches,modifiedMatches1});
    } catch (error) {
        // Handle any errors
        res.status(400).json({ success: false, error: error.message });
    }
});

  router.get('/league', async (req, res) => {
    try {
      const league = await Team.distinct("type");
      res.json(league);
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  router.get('/venue', async (req, res) => {
    try {
      const venues = await Scorecard.distinct("matchInfo.venue");
      
      res.render('venue',{
        title: 'Venues',
        activePage: "venue",
        venues,
        matches: []
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });  

  router.get('/scorecard/:matchId', async (req, res) => {
    const { matchId } = req.params;
  
    try {
      // Find the scorecard by ID
      const scorecard = await Scorecard.findById(matchId);
      
      if (!scorecard) {
        return res.status(404).send('Match not found');
      }
  
      // Pass scorecard data to the view
      res.render('scorecard', { 
        title: 'Scorecard',
        activePage: "scorecard",
        matchId: matchId,
        scorecard });
    } catch (error) {
      console.error('Error fetching scorecard:', error);
      res.status(500).send('Error fetching scorecard');
    }
  });
  
  // Get Unique Venues Endpoint
  router.get('/venues', async (req, res) => {
    try {
      const venues = await Scorecard.distinct("matchInfo.venue");
      res.json(venues);
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // Get Matches By Venue Endpoint
  router.get('/matchByVenue', async (req, res) => {
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
  router.get('/matchDetails', async (req, res) => {
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
  
  // Get All League Teams Endpoint
  router.get('/getAllLeagueTeam', async (req, res) => {
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
module.exports = router;