const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: String,      // Name of the team
  type: {            // Type of team (e.g., "international")
    type: String,
    default: "Women's Big Bash League",
  },
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;