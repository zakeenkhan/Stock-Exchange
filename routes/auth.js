import express from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { forwardAuthenticated } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => {
  res.render('auth/login', {
    title: 'Login - Stoker',
    layout: './layouts/auth',
    showNavbar: false
  });
});

// Login Handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/auth/login',
    failureFlash: true
  })(req, res, next);
});

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => {
  res.render('auth/register', {
    title: 'Register - Stoker',
    layout: './layouts/auth',
    showNavbar: false
  });
});

// Register Handle
router.post('/register', async (req, res) => {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  // Check required fields
  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please fill in all fields' });
  }

  // Check passwords match
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  // Check password length
  if (password.length < 6) {
    errors.push({ msg: 'Password should be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('auth/register', {
      title: 'Register - Stoker',
      layout: './layouts/auth',
      showNavbar: false,
      errors,
      name,
      email,
      password,
      password2
    });
  } else {
    try {
      // Check if user exists
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length > 0) {
        // User exists
        errors.push({ msg: 'Email is already registered' });
        res.render('auth/register', {
          title: 'Register - Stoker',
          layout: './layouts/auth',
          showNavbar: false,
          errors,
          name,
          email,
          password,
          password2
        });
      } else {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        await query(
          'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
          [name, email, hashedPassword]
        );

        req.flash('success_msg', 'You are now registered and can log in');
        res.redirect('/auth/login');
      }
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Server error during registration');
      res.redirect('/auth/register');
    }
  }
});

// Logout Handle
router.get('/logout', (req, res) => {
  req.logout(() => {
    req.flash('success_msg', 'You are logged out');
    res.redirect('/auth/login');
  });
});

// Google OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {
    // Successful authentication
    res.redirect('/dashboard');
  }
);

// Forgot Password
router.get('/forgot-password', forwardAuthenticated, (req, res) => {
  res.render('auth/forgot-password', { title: 'Forgot Password' });
});

// Reset Password
router.post('/forgot-password', forwardAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (user.rows.length === 0) {
      req.flash('error_msg', 'Email not registered');
      return res.redirect('/auth/forgot-password');
    }
    
    // In a real app, you would:
    // 1. Generate a password reset token
    // 2. Store it in the database with an expiration
    // 3. Send an email with the reset link
    
    req.flash('success_msg', 'Password reset instructions sent to your email');
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/auth/forgot-password');
  }
});

export default router;