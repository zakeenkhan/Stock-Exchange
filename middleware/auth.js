// Authentication middleware

/**
 * Middleware to ensure user is authenticated
 * If not authenticated, redirects to login page
 */
export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Please log in to view this resource');
  res.redirect('/auth/login');
};

/**
 * Middleware to ensure user is not authenticated
 * If authenticated, redirects to dashboard
 */
export const forwardAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
};

/**
 * Middleware to ensure user is an admin
 * If not admin, redirects to dashboard
 */
export const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.is_admin) {
    return next();
  }
  req.flash('error_msg', 'Unauthorized access');
  res.redirect('/dashboard');
};