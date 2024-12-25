const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Subschema for the scoreCard's batting data
const BattingSchema = new Schema({
  Batsman: { type: String, required: true },
  Dismissal: { type: String, required: true },
  R: { type: Number, required: true },
  Balls: { type: Number, required: true },
  Mins: { type: Number, required: true },
  '4s': { type: Number, required: true },
  '6s': { type: Number, required: true },
  SR: { type: Number, required: true }
});

// Subschema for the scoreCard's bowling data
const BowlingSchema = new Schema({
  Bowler: { type: String, required: true },
  O: { type: Number, required: true },
  Md: { type: Number, required: true },
  R: { type: Number, required: true },
  W: { type: Number, required: true },
  Eco: { type: Number, required: true },
  Wd: { type: String, required: true },
  Nb: { type: String, required: true },
  '0': { type: Number, required: true },
  '4': { type: Number, required: true },
  '6': { type: Number, required: true }
});

// Subschema for the matchInfo
const MatchInfoSchema = new Schema({
  team1: { type: String, required: true },
  team1Abbr: { type: String, required: true },
  team2: { type: String, required: true },
  team2Abbr: { type: String, required: true },
  matchDate: { type: String, required: true },
  league: { type: String, required: true },
  venue: { type: String, required: true }
});

// Subschema for the scoreCard
const ScoreCardSchema = new Schema({
  innings: { type: String, required: true },
  data: [Schema.Types.Mixed] // Can store both BattingSchema and BowlingSchema
});

// Main schema for the match document
const MatchSchema = new Schema({
  matchInfo: MatchInfoSchema,
  scoreCard: [ScoreCardSchema]
});

// Create model from schema
const Scorecard = mongoose.model('Scorecard', MatchSchema);

module.exports = Scorecard;