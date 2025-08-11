import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import flash from 'connect-flash';
import methodOverride from 'method-override';
import cors from 'cors';
import dotenv from 'dotenv';
import initPassport from './config/passport.js';

// Import routes
import indexRouter from './routes/index.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import stockRouter from './routes/stock.js';
import listsRouter from './routes/lists.js';
import accountRouter from './routes/account.js';
import adminRouter from './routes/admin.js';
import priceAlertRoutes from './routes/priceAlerts.js';

// Import database connection
import { testConnection, checkRequiredTables } from './config/database.js';

// Initialize app
const app = express();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// View engine setup (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(cors({
  origin: true,
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
}));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'stocker_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 1000 * 60 * 60 * 24 * 3, // 3 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  })
);

// Configure passport strategies
initPassport(passport);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  // Ensure watchlists is always defined for templates that reference it
  res.locals.watchlists = res.locals.watchlists || [];
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
// Serve root-level asset folders so links like /css/style.css work
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/lib', express.static(path.join(__dirname, 'lib')));
app.use('/img', express.static(path.join(__dirname, 'img')));
// In case any scripts are kept at the project root
app.use('/js', express.static(path.join(__dirname, 'js')));

// Routes
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/stock', stockRouter);
app.use('/lists', listsRouter);
app.use('/account', accountRouter);
app.use('/admin', adminRouter);
app.use('/api/price-alerts', priceAlertRoutes);

// Database connection check
app.use(async (req, res, next) => {
  // Skip database check for static resources and maintenance page
  if (req.path.startsWith('/public') || 
      req.path.startsWith('/css') || 
      req.path.startsWith('/js') || 
      req.path.startsWith('/lib') || 
      req.path.startsWith('/img') ||
      req.path === '/maintenance') {
    return next();
  }
  
  try {
    await testConnection();
    await checkRequiredTables();
    next();
  } catch (err) {
    console.error('Database connection error:', err.message);
    // Redirect to maintenance page instead of showing error
    return res.redirect('/maintenance');
  }
});

// 404 handler
app.use((req, res) => {
  console.log('404 handler triggered for:', req.originalUrl);
  
  // If it's an API request, return JSON
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ 
      success: false, 
      message: 'The requested resource was not found.' 
    });
  }
  
  // For regular web requests, show flash message and redirect
  req.flash('error_msg', 'Please Add and view stocks from the main page.');
  
  // Only redirect to dashboard if user is authenticated
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  
  // Otherwise, redirect to home page
  res.redirect('/');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error handler triggered:', err.message);
  console.error(err.stack);
  
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV === 'development' ? err : {};
  
  // For API requests, return JSON
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
  }
  
  // For web requests, render error page
  res.status(err.status || 500);
  res.render('error', {
    title: 'Error - Stoker',
    showHero: false,
    showNavbar: true,
    activeNav: '',
    error: err
  });
});

// Start server
const PORT = process.env.PORT || 3004;

// Start server regardless of database connection
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  
  try {
    // Test database connection
    const connected = await testConnection();
    
    if (connected) {
      console.log('Database connection successful');
      
      // Check for required tables
      const tablesExist = await checkRequiredTables();
      if (!tablesExist) {
        console.error('ERROR: Some required database tables are missing.');
        console.log('Please run the database setup script to create the required tables.');
      }
    } else {
      console.error('Warning: Application running without database connection');
      console.log('Please check your database credentials in .env file');
      console.log('Some features will not work until database connection is restored');
    }
  } catch (err) {
    console.error('Error during database initialization:', err);
  }
});

export default app;