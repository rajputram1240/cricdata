const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  recentScores: { type: String, default:"NA"  },
  avgPoints: { type: mongoose.Schema.Types.Mixed, default:"NA"  },
  totalRuns: { type: mongoose.Schema.Types.Mixed, default:"NA" },
  totalWickets: { type: mongoose.Schema.Types.Mixed, default:"NA" }
});
const MatchSchema = new mongoose.Schema({
  league: { type: String, required: true, default: "Super Smash 2024-25" },
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  date: { type: Date, required: true },
  venue: { type: String, required: true },
  team1Probable: { type: [playerSchema], default:[] }, // Array of Player objects
  team2Probable: { type: [playerSchema], default:[] }, // Array of Player objects
  team1Squad: {
    type: [String], 
    required: true,
  },
  team2Squads: {
    type: [String], 
    required: true,
  },
  venueData: {
    type: [Object]
  },
  h2hData: {
    type: [Object]
  },
  matchupData: {
    type: Map,
    of: {
        type: Map,
        of: Number  // This ensures the second map holds the count of each bowler against the batsman
    }
  },
  batsman50h2h:{
    type: [Object]
  },
  bowler3h2h:{
    type: [Object]
  },  
  batsman50venue:{
    type: [Object]
  },
  bowler3venue:{
    type: [Object]
  },  
  playerProbability:{
    type: [Object]
  }, 
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Match = mongoose.model('Match', MatchSchema);

module.exports = Match;