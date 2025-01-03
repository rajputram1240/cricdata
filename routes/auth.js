const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require("../models/Match")
const multer = require('multer');
const bucket = require('../config/googleCloudStorage');
const upload = multer({ storage: multer.memoryStorage() });
const { isAuthenticatedUser,isAuthenticated } = require('../middlewares/auth');
const crypto = require('crypto');
const path = require('path');


router.get('/register', (req, res) => {
  res.render('register', { 
    title: 'User registration',
    activePage: "register",
    message: ""
   });
});

// Handle registration
router.post('/register', async (req, res) => {
  const { username, email ,password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('register', { message: 'Username already exists' });
    }

    const user = new User({ username, password, email });
    await user.save();
    req.flash('success_msg', 'Registration successful! You can now log in.');
    res.redirect('/login');
  } catch (err) {
    req.flash('error_msg', 'Registration failed. Please try again.');
    res.redirect('/register');
  }
});

router.get('/profile',isAuthenticatedUser, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render('profile',{
    title: 'User Profile',
    activePage: "profile",
    user
  }); // Pass user to the EJS template
});

router.post('/profile', isAuthenticatedUser, upload.single('profileImage'), async (req, res) => {

  try {
    if (req.file){
        
      const originalFileName = req.file.originalname;  // e.g., 'image.jpg'

      // Extract file extension (including the dot)
      const fileExtension = path.extname(originalFileName);  // e.g., '.jpg'

      // Generate random file name with crypto
      const randomFileName = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
      const blob = bucket.file(randomFileName);
        const blobStream = blob.createWriteStream();
    
        blobStream.on('error', (err) => {
          console.error('Upload error:', err);
          res.status(500).send('Unable to upload file.');
        });
    
        blobStream.on('finish', async () => {
          blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          const user = await User.findById(req.session.userId);
          // Update username and email
          if (req.body.username) user.username = req.body.username;
          if (req.body.email) user.email = req.body.email;
          // If a new profile image is uploaded, update the image field
          user.profileImage = publicUrl;        
          await user.save();
          req.session.userId = user._id;
          req.session.username = user.username;
          req.session.email = user.email;
          req.session.role = user.role;
          req.session.profileImage = user.profileImage;
          req.flash('success_msg', 'Your profile successfully updated');
          res.redirect('/profile');
        });
    
        blobStream.end(req.file.buffer);
    } else {
        const user = await User.findById(req.session.userId);
    // Update username and email
    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;
    // If a new profile image is uploaded, update the image field
    await user.save();
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.email = user.email;
    req.session.role = user.role;
    req.session.profileImage = user.profileImage;
    req.flash('success_msg', 'Your profile successfully updated');
    res.redirect('/profile');
    }

   
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Render login page
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Home',
    activePage: "home",
    heroImage: 'https://source.unsplash.com/1600x900/?cricket',
    heroText: 'Welcome to Cricket Portal',
    cards: [
      {
        image: 'https://source.unsplash.com/600x400/?stadium',
        title: 'Venue Matches',
        description: 'Explore matches grouped by venue and get detailed insights.',
        link: '/venue',
      },
      {
        image: 'https://source.unsplash.com/600x400/?team',
        title: 'Head to Head',
        description: 'Analyze match history between your favorite teams.',
        link: '/h2h',
      },
    ],
    year: new Date().getFullYear(),
  });
});


router.get("/login", async (req, res)=>{
  res.render('login',{
    title: 'User Login',
    activePage: "login",
    message: ""
  });
})

// Handle login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (user && (await user.isPasswordValid(password))) {
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.role = user.role;
      req.session.profileImage = user.profileImage;
      req.flash('success_msg', `Welcome back, ${user.username}!`);
      res.redirect('/profile');
    } else {
      req.flash('error_msg', 'Invalid email or password.');
      res.redirect('/login');sssss
    }
  } catch (err) {
    req.flash('error_msg', 'Login failed. Please try again.');
    res.redirect('/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Admin Dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  const matches = await Match.find();
  res.render('dashboard', { matches });
});

// Add Match Page
router.get('/matches/new', isAuthenticated, (req, res) => {
  res.render('add-match');
});

// Add Match Handler
router.post('/matches', isAuthenticated, async (req, res) => {
  const { team1, team2, date, venue } = req.body;
  const match = new Match({ team1, team2, date, venue });
  await match.save();
  res.redirect('/dashboard');
});

// Edit Match Page
router.get('/matches/:id/edit', isAuthenticated, async (req, res) => {
  const match = await Match.findById(req.params.id);
  res.render('edit-match', { match });
});

// Update Match Handler
router.post('/matches/:id', isAuthenticated, async (req, res) => {
  const { team1, team2, date, venue } = req.body;
  await Match.findByIdAndUpdate(req.params.id, { team1, team2, date, venue });
  res.redirect('/dashboard');
});

// Delete Match Handler
router.post('/matches/:id/delete', isAuthenticated, async (req, res) => {
  await Match.findByIdAndDelete(req.params.id);
  res.redirect('/dashboard');
});

module.exports = router;