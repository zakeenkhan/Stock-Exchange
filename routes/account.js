import express from 'express';
import { 
  getAccountPage, 
  updateProfile, 
  setPassword, 
  updateNotifications,
  getUserData 
} from '../controllers/accountController.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Account page route
router.get('/', ensureAuthenticated, getAccountPage);

// Get user data (API)
router.get('/user-data', ensureAuthenticated, getUserData);

// Update profile
router.post('/update-profile', ensureAuthenticated, updateProfile);

// Set/update password
router.post('/set-password', ensureAuthenticated, setPassword);

// Update notification preferences
router.post('/update-notifications', ensureAuthenticated, updateNotifications);

export default router;
