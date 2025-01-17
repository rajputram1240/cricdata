const express = require('express');
const multer = require('multer');
const bucket = require('../config/googleCloudStorage');
const { isAuthenticatedUser , isAuthenticated } = require('../middlewares/auth');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const FantasyCombination = require("../models/FantasyCombination");
const Match = require("../models/Match");
const User = require("../models/User");
const crypto = require('crypto');
const path = require('path');


// POST route to handle image upload
router.post('/postCombination', isAuthenticatedUser,upload.single('image'), (req, res, next) => {
  const { matchId } = req.body;
  if (req.fileValidationError) {
    req.flash('error_msg', 'Only image are allowed!');
    return res.redirect('/fantasy/'+matchId);
  }
  if (req.file && !req.file.mimetype.startsWith('image/')) {
    req.flash('error_msg', 'Only image are allowed!');
    return res.redirect('/fantasy/'+matchId);
  }
  next();
}, async (req, res) => {
    try {
        const { matchId } = req.body;
  
    if (!matchId) {
      req.flash('error_msg', 'Match ID is required.');
      return res.redirect('/fantasy/'+matchId);
    }
        if (!req.file) {
          req.flash('error_msg', 'No file uploaded.');
          return res.redirect('/fantasy/'+matchId);
        }
        const originalFileName = req.file.originalname;  // e.g., 'image.jpg'
        // Extract file extension (including the dot)
        const fileExtension = path.extname(originalFileName);  // e.g., '.jpg'
       
        // Generate random file name with crypto
        const randomFileName = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
        const blob = bucket.file(randomFileName);
        const blobStream = blob.createWriteStream();
    
        blobStream.on('error', (err) => {
          req.flash('error_msg', 'Unable to upload file.');
          return res.redirect('/fantasy/'+matchId);
        });
    
        blobStream.on('finish', async () => {
            blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

          const userId = await User.findById(req.session.userId);
          
          // Save file metadata to MongoDB
          const combination = new FantasyCombination({ 
            userId: userId._id, // Logged-in user's ID
            matchId, 
            teamImage: publicUrl, 
            likes: [], 
            comments: [] 
          });

          await combination.save();
          req.flash('success_msg', `Team combination successfully posted!, Admin will approve soon.`);
          return res.redirect('/fantasy/'+matchId);
        });
    
        blobStream.end(req.file.buffer);
      } catch (err) {
        req.flash('error_msg', err.message);
        res.json({ success: true, message: err.message});
      }
  });
  
  // POST route to handle liking a combination
  router.post('/likeCombination/:id', async (req, res) => {
    try {
      // Find the combination by its ID
      const combination = await FantasyCombination.findById(req.params.id);
  
      if (!combination) {
        return res.status(404).json({ success: false, message: 'Combination not found' });
      }
  
      // Assuming 'user' is the logged-in user, you can replace this with actual user information
       const userId = req.session.userId;  // Get user ID from the session or token
  
      // Check if the user has already liked this combination
      if (combination.likes.includes(userId)) {
        req.flash('error_msg', 'You have already liked this combination.');
        return res.status(400).json({ success: false, message: 'You have already liked this combination' });
      }
  
      // Add the user ID to the likes array
      combination.likes.push(userId);
  
      // Save the updated combination
      await combination.save();
      
      req.flash('success_msg', 'You have liked this combination.');
      res.json({ success: true, likes: combination.likes.length });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  // POST route to handle commenting
  router.post('/commentCombination/:id', async (req, res) => {
    try {
      // Find the combination by its ID
      const combination = await FantasyCombination.findById(req.params.id);
  
      if (!combination) {
        return res.status(404).json({ success: false, message: 'Combination not found' });
      }
  
      // Assuming 'user' is the logged-in user, you can replace this with actual user information
      const userId = req.session.userId;  // Get user ID from the session or token
      const username = req.session.username; // Get username from the session or token
  
      // Create a new comment
      const newComment = {
        userId,
        username, // User's username
        text: req.body.comment, // Comment text from the request
      };
  
      // Add the comment to the combination
      combination.comments.push(newComment);
  
      // Save the updated combination
      await combination.save();
      
      req.flash('success_msg', 'You comment on this combination.');
      res.json({ success: true, username: username, comment: newComment });
    } catch (error) {
      req.flash('error_msg', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  // Route to get upcoming matches
  router.get('/matches', async (req, res) => {
    const matches = await Match.find().sort({ matchDate: 1 });

    res.render('fantasy', { 
      title: 'Fantasy',
      activePage: "fantasy",
      matches 
    });
  });
  
  // Route to get fantasy combinations for a match
  router.get('/fantasy/:matchId', async (req, res) => {
    const { matchId } = req.params;
  
    try {
      const match = await Match.findById(matchId);
  
      const filter = req.query.filter || 'newest';  // Default to 'newest'
  
      const sortOptions = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        mostLikes: { 'likes.length': -1 },
        mostComments: { 'comments.length': -1 },
      };
  
      const combinations = await FantasyCombination.find({
        matchId,
        approved: { $ne: "rejected" }
      }).populate('userId').sort(sortOptions[filter] || sortOptions.newest);
  
      const matchupObject = Object.fromEntries(
        Array.from(match.matchupData.entries()).map(([batsman, bowlers]) => [
          batsman,
          Object.fromEntries(bowlers)
        ])
      );

     console.log([...match.team1Probable,...match.team2Probable]);
  
      res.render('fantasyDetails', {
        title: 'Fantasy Discussion',
        activePage: "fantasy",
        filter,
        match,
        fiftyPlusScoresh2h: match.batsman50h2h[0] || [],
        fiftyPlusScoresvenue: match.batsman50venue[0] || [],
        threePlusWkth2h: match.bowler3h2h[0] || [],
        threePlusWktvenue: match.bowler3venue[0] || [],
        venueData: match.venueData.length ? match.venueData[0] : [],
        h2hData: match.h2hData.length ? match.h2hData[0] : [],
        playerProbability: match.playerProbability.length ? match.playerProbability : [],
        matchupData: matchupObject || {},
        matchId,
        combinations
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error approving combination.' });
    }
  });  
  
  
  router.post('/combinations/approve/:id', isAuthenticated, async (req, res) => {
    try {
      await FantasyCombination.findByIdAndUpdate(req.params.id, { approved: "approved" });
      res.json({ success: true, message: 'Combination approved successfully.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error approving combination.' });
    }
  });
  
  router.post('/combinations/reject/:id', isAuthenticated, async (req, res) => {
    try {
      await FantasyCombination.findByIdAndUpdate(req.params.id, { approved: "rejected" });
      res.json({ success: true, message: 'Combination rejected successfully.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error approving combination.' });
    }
  });
  
  router.get('/combinations/pending', isAuthenticated, async (req, res) => {
    try {
      const pendingCombinations = await FantasyCombination.find({ approved: "pending" });
      res.render('combinations', { combinations: pendingCombinations,
        title: 'pending combinations',
    activePage: "pending",
    message: ""
       });
    } catch (error) {
      res.status(500).send('Error fetching pending combinations.');
    }
  });

  router.get('/combinations/all', isAuthenticated, async (req, res) => {
    try {
      const allcombinations = await FantasyCombination.find();
      res.render('allcombinations', { combinations: allcombinations,
        title: 'all combinations',
    activePage: "allcombinations",
    message: ""
       });
    } catch (error) {
      res.status(500).send('Error fetching pending combinations.');
    }
  });

module.exports = router;  