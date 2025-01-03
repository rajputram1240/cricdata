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
  
  module.exports = { isAuthenticated, isAuthenticatedUser };  