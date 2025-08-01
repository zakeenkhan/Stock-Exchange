import bcrypt from 'bcrypt';
import db from '../config/database.js';

// Render account page
export const getAccountPage = async (req, res) => {
  try {
    // Fetch user data with all fields
    const userResult = await db.query(
      'SELECT id, name, email, bio, email_notifications, price_alerts, newsletter, password IS NOT NULL as has_password FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const user = userResult.rows[0];
    
    res.render('account', {
      user: {
        ...user,
        // Ensure boolean values
        email_notifications: user.email_notifications !== undefined ? user.email_notifications : true,
        price_alerts: user.price_alerts !== undefined ? user.price_alerts : true,
        newsletter: user.newsletter !== undefined ? user.newsletter : true
      },
      title: 'Account Settings - Stoker',
      activeNav: 'account'
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    req.flash('error_msg', 'Error loading account settings');
    res.redirect('/dashboard');
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  const { name, bio } = req.body;
  const userId = req.user.id;

  try {
    await db.query(
      'UPDATE users SET name = $1, bio = $2, updated_at = NOW() WHERE id = $3',
      [name, bio, userId]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// Set or update password
export const setPassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;

  try {
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Check password length
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    // Get user's current password hash if it exists
    const userResult = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    // If user has an existing password, verify current password
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password in the database
    await db.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ success: false, message: 'An error occurred while updating your password' });
  }
};

// Update notification preferences
export const updateNotifications = async (req, res) => {
  const { emailNotifications, priceAlerts, newsletter } = req.body;
  const userId = req.user.id;

  try {
    await db.query(
      `UPDATE users 
       SET email_notifications = $1, 
           price_alerts = $2, 
           newsletter = $3,
           updated_at = NOW() 
       WHERE id = $4`,
      [emailNotifications, priceAlerts, newsletter, userId]
    );

    res.json({ success: true, message: 'Notification preferences updated' });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification preferences' });
  }
};

// Get user data (for API)
export const getUserData = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, bio, email_notifications, price_alerts, newsletter FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user data' });
  }
};
