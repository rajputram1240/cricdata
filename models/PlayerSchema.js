const mongoose = require('mongoose');

// Define Player Schema
const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  recentScores: { type: String, default: "Not Available" },
  avgPoints: { type: Number, default: 0 },
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 }, // Optional field for bowlers
});

// Export PlayerSchema to reuse
module.exports = PlayerSchema;