const express = require('express');
const connectDB = require('./config/database');
const bodyParser = require('body-parser');
const session = require('express-session');
const fantasy = require("./routes/fantasy");
const auth = require("./routes/auth");
const h2h = require("./routes/index");
const attachUserDetails = require('./userMiddleware');
const flash = require('connect-flash');

require('dotenv').config();

const app = express();
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
connectDB();
app.use("/",[auth,fantasy,h2h]);
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));