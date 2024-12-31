const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const Match = require('./models/Match');
const User = require('./models/User'); // Admin User Model
const Scorecard = require('./models/scorecard');
const FantasyCombination = require("./models/FantasyCombination");
const Team = require('./models/team');  // Import Team model
const multer = require('multer');
const path = require('path');
const attachUserDetails = require('./userMiddleware');
const flash = require('connect-flash');

require('dotenv').config();

const app = express();

// File upload setup using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Middleware
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(attachUserDetails);

// Middleware for flash messages
app.use(flash());

// Set locals for flash messages (available in all templates)
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(err));

// Middleware for authentication
function isAuthenticated(req, res, next) {
  if (req.session.role != "admin") {
    return res.redirect('/');
  } else {
    next();
  }
}

// Middleware for authentication
function isAuthenticatedUser(req, res, next) {
  if (!req.session.username) {
    return res.redirect('/');
  } else {
    next();
  }
}

// POST route to handle image upload
app.post('/postCombination', isAuthenticatedUser,upload.single('image'), async (req, res) => {
  const imageUrl = `/uploads/${req.file.filename}`;
  const { matchId } = req.body;

  if (!matchId) {
    req.flash('error_msg', 'Match ID is required.');
  }

  if (!req.file) {
    req.flash('error_msg', 'Team image is required.');
  }


  const userId = await User.findById(req.session.userId);

  const combination = new FantasyCombination({ 
    userId: userId._id, // Logged-in user's ID
    matchId, 
    teamImage: imageUrl, 
    likes: [], 
    comments: [] 
  });
  await combination.save();
  
  req.flash('success_msg', `Team combination by successfully posted!`);
  res.json({ success: true, message: `Team combination by successfully posted!` });
});

// POST route to handle liking a combination
app.post('/likeCombination/:id', async (req, res) => {
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
app.post('/commentCombination/:id', async (req, res) => {
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
app.get('/matches', async (req, res) => {
  const matches = await Match.find().sort({ matchDate: 1 });
  console.log(matches);
  res.render('fantasy', { 
    title: 'Fantasy',
    activePage: "fantasy",
    matches 
  });
});

// Route to get fantasy combinations for a match
app.get('/fantasy/:matchId', async (req, res) => {
  const { matchId } = req.params;
  const match = await Match.findById(matchId);

   const filter = req.query.filter || 'newest';  // Default to 'newest'

  let combinations;
  if (filter === 'newest') {
    combinations = await FantasyCombination.find({ matchId,approved: "approved" }).populate('userId').sort({ createdAt: -1 });
  } else if (filter === 'oldest') {
    combinations = await FantasyCombination.find({ matchId,approved: "approved" }).populate('userId').sort({ createdAt: 1 });
  } else if (filter === 'mostLikes') {
    combinations = await FantasyCombination.find({ matchId,approved: "approved" }).populate('userId').sort({ 'likes.length': -1 });
  } else if (filter === 'mostComments') {
    combinations = await FantasyCombination.find({ matchId, approved: "approved" }).populate('userId').sort({ 'comments.length': -1 });
  }
  
  res.render('fantasyDetails', { 
    title: 'Fantasy Discussion',
    activePage: "fantasy",
    filter,
    match,
    matchId, combinations });
});


app.post('/combinations/approve/:id', isAuthenticated, async (req, res) => {
  try {
    await FantasyCombination.findByIdAndUpdate(req.params.id, { approved: "approved" });
    res.json({ success: true, message: 'Combination approved successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error approving combination.' });
  }
});

app.post('/combinations/reject/:id', isAuthenticated, async (req, res) => {
  try {
    await FantasyCombination.findByIdAndUpdate(req.params.id, { approved: "rejected" });
    res.json({ success: true, message: 'Combination rejected successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error approving combination.' });
  }
});

app.get('/combinations/pending', isAuthenticated, async (req, res) => {
  try {
    const pendingCombinations = await FantasyCombination.find({ approved: "pending" });
    res.render('combinations', { combinations: pendingCombinations });
  } catch (error) {
    res.status(500).send('Error fetching pending combinations.');
  }
});


app.get('/register', (req, res) => {
  res.render('register', { 
    title: 'User registration',
    activePage: "register",
    message: ""
   });
});

// Handle registration
app.post('/register', async (req, res) => {
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

app.get('/profile',isAuthenticatedUser, async (req, res) => {
  const user = await User.findById(req.session.userId);
 console.log("user",user)
  res.render('profile',{
    title: 'User Profile',
    activePage: "profile",
    user
  }); // Pass user to the EJS template
});

app.post('/profile', isAuthenticatedUser, upload.single('profileImage'), async (req, res) => {

  try {
    const user = await User.findById(req.session.userId);
    
    // Update username and email
    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;
    
    // If a new profile image is uploaded, update the image field
    if (req.file) user.profileImage = `/uploads/${req.file.filename}`;
    
    await user.save();
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.email = user.email;
    req.session.role = user.role;
    req.session.profileImage = user.profileImage;

    req.flash('success_msg', 'Your profile successfully updated');
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Render login page
app.get('/', (req, res) => {
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

app.get('/h2h',async (req,res)=> {
  const leagues = await Team.distinct("type");
  res.render('h2h',{
    title: 'Head to head',
    activePage: "head2head",
    leagues,
    matches: []
  });
})

app.get('/head2head', async (req, res) => {
  const { team1, team2 } = req.query;

  if (!team1 || !team2) {
    return res.status(400).json({ success: false, error: 'Please select team' });
  }

  try {
    const matches = await Scorecard.find({
      $or: [
        { "matchInfo.team1": team1, "matchInfo.team2": team2 },
        { "matchInfo.team1": team2, "matchInfo.team2": team1 },
      ]
    });

    res.json(matches);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get Unique league Endpoint
app.get('/league', async (req, res) => {
  try {
    const league = await Team.distinct("type");
    res.json(league);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/venue', async (req, res) => {
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

app.get('/scorecard/:matchId', async (req, res) => {
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
app.get('/venues', async (req, res) => {
  try {
    const venues = await Scorecard.distinct("matchInfo.venue");
    res.json(venues);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get Matches By Venue Endpoint
app.get('/matchByVenue', async (req, res) => {
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
app.get('/matchDetails', async (req, res) => {
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
app.get('/getAllLeagueTeam', async (req, res) => {
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

app.get("/login", async (req, res)=>{
  res.render('login',{
    title: 'User Login',
    activePage: "login",
    message: ""
  });
})

// Handle login
app.post('/login', async (req, res) => {
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
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Admin Dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
  const matches = await Match.find();
  res.render('dashboard', { matches });
});

// Add Match Page
app.get('/matches/new', isAuthenticated, (req, res) => {
  res.render('add-match');
});

// Add Match Handler
app.post('/matches', isAuthenticated, async (req, res) => {
  const { team1, team2, date, venue } = req.body;
  const match = new Match({ team1, team2, date, venue });
  await match.save();
  res.redirect('/dashboard');
});

// Edit Match Page
app.get('/matches/:id/edit', isAuthenticated, async (req, res) => {
  const match = await Match.findById(req.params.id);
  res.render('edit-match', { match });
});

// Update Match Handler
app.post('/matches/:id', isAuthenticated, async (req, res) => {
  const { team1, team2, date, venue } = req.body;
  await Match.findByIdAndUpdate(req.params.id, { team1, team2, date, venue });
  res.redirect('/dashboard');
});

// Delete Match Handler
app.post('/matches/:id/delete', isAuthenticated, async (req, res) => {
  await Match.findByIdAndDelete(req.params.id);
  res.redirect('/dashboard');
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));