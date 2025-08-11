import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import db from './database.js';

export default function initPassport(passport) {
  // Serialize user for the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id, done) => {
    try {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        done(null, result.rows[0]);
      } else {
        done(new Error('User not found'));
      }
    } catch (err) {
      done(err);
    }
  });

  // Local Strategy
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // Check if user exists
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
          return done(null, false, { message: 'Email not registered' });
        }

        const user = result.rows[0];

        // Check if a password is set and is a valid string for this user
        if (typeof user.password !== 'string' || user.password.length === 0) {
          return done(null, false, { message: 'No password is set for this account. Please log in with Google or reset your password.' });
        }

        // Match password
        try {
          const isMatch = await bcrypt.compare(password, user.password);
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Password incorrect' });
          }
        } catch (err) {
          console.error('Password comparison error:', err);
          return done(null, false, { message: 'Login error occurred' });
        }
      } catch (err) {
        console.error('Database error:', err);
        return done(err);
      }
    })
  );

  // Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        console.log('--- Google Authentication ---');
        console.log('Received profile from Google:', JSON.stringify(profile, null, 2));

        try {
          // Check if user exists with Google ID
          const result = await db.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);

          if (result.rows.length > 0) {
            console.log('Existing user found with google_id:', profile.id);
            return done(null, result.rows[0]);
          }

          // If no user with that Google ID, check if the email is already in use
          const emailResult = await db.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
          if (emailResult.rows.length > 0) {
            console.log('Email already exists. Linking Google ID to existing user.');
            const existingUser = emailResult.rows[0];
            await db.query('UPDATE users SET google_id = $1, profile_image = $2, is_verified = $3 WHERE id = $4',
              [profile.id, profile.photos[0].value, true, existingUser.id]);
            return done(null, existingUser);
          }

          // If no user exists, create a new one
          console.log('Creating new user with Google profile.');
          const newUser = {
            name: profile.displayName,
            email: profile.emails[0].value,
            google_id: profile.id,
            profile_image: profile.photos[0].value,
            is_verified: true
          };

          const insertResult = await db.query(
            'INSERT INTO users (name, email, google_id, profile_image, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [newUser.name, newUser.email, newUser.google_id, newUser.profile_image, newUser.is_verified]
          );

          const createdUser = insertResult.rows[0];
          console.log('New user created:', JSON.stringify(createdUser, null, 2));

          // Create default list for user
          await db.query(
            'INSERT INTO lists (user_id, name) VALUES ($1, $2)',
            [createdUser.id, 'My List']
          );

          // Create default portfolio for user
          await db.query(
            'INSERT INTO portfolios (user_id, name) VALUES ($1, $2)',
            [createdUser.id, 'My Portfolio']
          );

          return done(null, createdUser);

        } catch (err) {
          console.error('Error in Google Strategy:', err);
          return done(err);
        }
      }
    )
  );
}