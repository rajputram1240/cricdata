// userMiddleware.js
const User = require('./models/User'); // Replace with your User model

const attachUserDetails = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        res.locals.user = {
          id: user._id,
          username: user.username,
          email: user.email, // Include other fields as needed
        };
      } else {
        res.locals.user = null;
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
};

module.exports = attachUserDetails;