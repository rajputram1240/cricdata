const mongoose = require('mongoose');
const PlayerSchema = require('./PlayerSchema');

const MatchSchema = new mongoose.Schema({
  league: { type: String, required: true },
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  date: { type: Date, required: true },
  venue: { type: String, required: true },
  team1Probable: { type: [PlayerSchema], required: true }, // Array of Player objects
  team2Probable: { type: [PlayerSchema], required: true }, // Array of Player objects
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Match = mongoose.model('Match', MatchSchema);

module.exports = Match;