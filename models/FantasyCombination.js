const mongoose = require('mongoose');

const fantasyCombinationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    teamImage: String, // Store the URL of the uploaded team image
    likes: [mongoose.Schema.Types.ObjectId], // List of users who liked
    comments: [{
      userId: mongoose.Schema.Types.ObjectId,
      username: String,
      text: String,
      timestamp: { type: Date, default: Date.now }
    }],
    approved: { type: String, enum: ['rejected', 'pending', 'approved'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  });
  
  const fantasyCombination = mongoose.model('FantasyCombination', fantasyCombinationSchema);
  
  module.exports = fantasyCombination;