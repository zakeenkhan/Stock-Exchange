import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ensureAuthenticated } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/profile');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

// Custom middleware to handle multer errors
const uploadWithErrorHandler = (req, res, next) => {
  const uploader = upload.single('profile_image');
  uploader(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred (e.g., file too large).
      req.flash('error_msg', err.message);
      return res.redirect('/user/profile');
    } else if (err) {
      // An unknown error occurred (like our file filter error).
      req.flash('error_msg', err.message);
      return res.redirect('/user/profile');
    }
    // Everything went fine.
    next();
  });
};

// User Profile
router.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    // Get user's lists count
    const listsCount = await db.query(
      'SELECT COUNT(*) FROM lists WHERE user_id = $1',
      [user.id]
    );
    
    // Get user's portfolios count
    const portfoliosCount = await db.query(
      'SELECT COUNT(*) FROM portfolios WHERE user_id = $1',
      [user.id]
    );
    
    res.render('user/profile', {
            showBackButton: true,
      title: 'My Profile',
      user,
      listsCount: parseInt(listsCount.rows[0].count),
      portfoliosCount: parseInt(portfoliosCount.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/dashboard');
  }
});

// Update Profile
router.post('/profile', ensureAuthenticated, uploadWithErrorHandler, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Start with basic update
    let query = 'UPDATE users SET name = $1';
    let params = [name];
    
    // If a file was uploaded, update the profile_image field
    if (req.file) {
      // Get the relative path to store in the database
      const relativePath = `/uploads/profile/${req.file.filename}`;
      
      // Add profile_image to the query
      query += ', profile_image = $' + (params.length + 1);
      params.push(relativePath);
      
      // Delete old profile image if it exists and isn't the default
      if (req.user.profile_image && !req.user.profile_image.includes('user-default.png')) {
        const oldImagePath = path.join(__dirname, '../public', req.user.profile_image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    // Add the timestamp and user ID
    query += ', updated_at = CURRENT_TIMESTAMP WHERE id = $' + (params.length + 1);
    params.push(req.user.id);
    
    // Execute the query
    await db.query(query, params);
    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/user/profile');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error while updating profile.');
    res.redirect('/user/profile');
  }
});

// Change Password
router.get('/change-password', ensureAuthenticated, (req, res) => {
  res.render('user/change-password', { title: 'Change Password', showBackButton: true });
});

router.post('/change-password', ensureAuthenticated, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    
    // Validation
    if (!current_password || !new_password || !confirm_password) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect('/user/change-password');
    }
    
    if (new_password !== confirm_password) {
      req.flash('error_msg', 'New passwords do not match');
      return res.redirect('/user/change-password');
    }
    
    if (new_password.length < 6) {
      req.flash('error_msg', 'Password should be at least 6 characters');
      return res.redirect('/user/change-password');
    }
    
    // Check if current password is correct
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    if (!user.rows[0].password) {
      req.flash('error_msg', 'You are using social login. Cannot change password.');
      return res.redirect('/user/profile');
    }
    
    const isMatch = await bcrypt.compare(current_password, user.rows[0].password);
    
    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/user/change-password');
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    
    // Update password
    await db.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );
    
    req.flash('success_msg', 'Password changed successfully');
    res.redirect('/user/profile');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/change-password');
  }
});

// Lists
router.get('/lists', ensureAuthenticated, async (req, res) => {
  try {
    // Get all user's lists
    const lists = await db.query(
      'SELECT * FROM lists WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    // For each list, get stocks
    for (const list of lists.rows) {
      const stocks = await db.query(`
        SELECT s.* FROM stocks s
        JOIN list_stocks ls ON s.id = ls.stock_id
        WHERE ls.list_id = $1
      `, [list.id]);
      
      list.stocks = stocks.rows;
    }
    
    res.render('user/lists', {
      title: 'My Lists',
      lists: lists.rows,
      showBackButton: true
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/dashboard');
  }
});

// Create new list
router.post('/lists', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      req.flash('error_msg', 'Please provide a name for your list');
      return res.redirect('/user/lists');
    }
    
    await db.query(
      'INSERT INTO lists (user_id, name, description) VALUES ($1, $2, $3)',
      [req.user.id, name, description]
    );
    
    req.flash('success_msg', 'List created successfully');
    res.redirect('/user/lists');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/lists');
  }
});

// Add stock to list
router.post('/lists/:id/stocks', ensureAuthenticated, async (req, res) => {
  try {
    const { stock_id } = req.body;
    const { id: list_id } = req.params;
    
    // Check if list belongs to user
    const list = await db.query(
      'SELECT * FROM lists WHERE id = $1 AND user_id = $2',
      [list_id, req.user.id]
    );
    
    if (list.rows.length === 0) {
      req.flash('error_msg', 'List not found');
      return res.redirect('/user/lists');
    }
    
    // Check if stock already in list
    const stockInList = await db.query(
      'SELECT * FROM list_stocks WHERE list_id = $1 AND stock_id = $2',
      [list_id, stock_id]
    );
    
    if (stockInList.rows.length > 0) {
      req.flash('error_msg', 'Stock already in list');
      return res.redirect(`/user/lists/${list_id}`);
    }
    
    // Add stock to list
    await db.query(
      'INSERT INTO list_stocks (list_id, stock_id) VALUES ($1, $2)',
      [list_id, stock_id]
    );
    
    req.flash('success_msg', 'Stock added to list');
    res.redirect(`/user/lists/${list_id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/lists');
  }
});

// Remove stock from list
router.delete('/lists/:list_id/stocks/:stock_id', ensureAuthenticated, async (req, res) => {
  try {
    const { list_id, stock_id } = req.params;
    
    // Check if list belongs to user
    const list = await db.query(
      'SELECT * FROM lists WHERE id = $1 AND user_id = $2',
      [list_id, req.user.id]
    );
    
    if (list.rows.length === 0) {
      req.flash('error_msg', 'List not found');
      return res.redirect('/user/lists');
    }
    
    // Remove stock from list
    await db.query(
      'DELETE FROM list_stocks WHERE list_id = $1 AND stock_id = $2',
      [list_id, stock_id]
    );
    
    req.flash('success_msg', 'Stock removed from list');
    res.redirect(`/user/lists/${list_id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/lists');
  }
});

// Delete list
router.delete('/lists/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if list belongs to user
    const list = await db.query(
      'SELECT * FROM lists WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (list.rows.length === 0) {
      req.flash('error_msg', 'List not found');
      return res.redirect('/user/lists');
    }
    
    // Delete list (cascade will delete list_stocks)
    await db.query('DELETE FROM lists WHERE id = $1', [id]);
    
    req.flash('success_msg', 'List deleted successfully');
    res.redirect('/user/lists');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/lists');
  }
});

// Portfolios
router.get('/portfolios', ensureAuthenticated, async (req, res) => {
  try {
    // Get all user's portfolios
    const portfolios = await db.query(
      'SELECT * FROM portfolios WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    // For each portfolio, get stocks and calculate values
    for (const portfolio of portfolios.rows) {
      const stocks = await db.query(`
        SELECT ps.id, ps.quantity, ps.purchase_price, 
               s.symbol, s.name, s.current_price 
        FROM portfolio_stocks ps
        JOIN stocks s ON ps.stock_id = s.id
        WHERE ps.portfolio_id = $1
      `, [portfolio.id]);
      
      portfolio.stocks = stocks.rows;
      
      // Calculate portfolio value
      portfolio.totalValue = portfolio.stocks.reduce((acc, stock) => {
        return acc + (stock.quantity * (stock.current_price || 0));
      }, 0);
      
      // Calculate total cost basis
      portfolio.costBasis = portfolio.stocks.reduce((acc, stock) => {
        return acc + (stock.quantity * stock.purchase_price);
      }, 0);
      
      // Calculate profit/loss
      portfolio.profitLoss = portfolio.totalValue - portfolio.costBasis;
      portfolio.profitLossPercent = portfolio.costBasis > 0 
        ? (portfolio.profitLoss / portfolio.costBasis) * 100 
        : 0;
    }
    
    res.render('user/portfolios', {
      showBackButton: true,
      title: 'My Portfolios',
      portfolios: portfolios.rows
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/dashboard');
  }
});

// Create new portfolio
router.post('/portfolios', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      req.flash('error_msg', 'Please provide a name for your portfolio');
      return res.redirect('/user/portfolios');
    }
    
    await db.query(
      'INSERT INTO portfolios (user_id, name, description) VALUES ($1, $2, $3)',
      [req.user.id, name, description]
    );
    
    req.flash('success_msg', 'Portfolio created successfully');
    res.redirect('/user/portfolios');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/portfolios');
  }
});

// View a single portfolio's details
router.get('/portfolios/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get portfolio details and verify ownership
    const portfolioResult = await db.query(
      'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (portfolioResult.rows.length === 0) {
      req.flash('error_msg', 'Portfolio not found or you do not have permission to view it.');
      return res.redirect('/user/portfolios');
    }

    const portfolio = portfolioResult.rows[0];

    // Get stocks in the portfolio
    const stocksResult = await db.query(`
      SELECT ps.id AS portfolio_stock_id, ps.quantity, ps.purchase_price, 
             s.id AS stock_id, s.symbol, s.name, s.current_price
      FROM portfolio_stocks ps
      JOIN stocks s ON ps.stock_id = s.id
      WHERE ps.portfolio_id = $1
      ORDER BY s.symbol
    `, [id]);

    portfolio.stocks = stocksResult.rows;

    // Calculate portfolio value
    portfolio.totalValue = portfolio.stocks.reduce((acc, stock) => {
      return acc + (stock.quantity * (stock.current_price || 0));
    }, 0);

    // Calculate total cost basis
    portfolio.costBasis = portfolio.stocks.reduce((acc, stock) => {
      return acc + (stock.quantity * stock.purchase_price);
    }, 0);

    // Calculate profit/loss
    portfolio.profitLoss = portfolio.totalValue - portfolio.costBasis;
    portfolio.profitLossPercent = portfolio.costBasis > 0 
      ? (portfolio.profitLoss / portfolio.costBasis) * 100 
      : 0;

    // Get all stocks for the add stock dropdown
    const allStocksResult = await db.query('SELECT id, symbol, name FROM stocks ORDER BY symbol');

    res.render('user/portfolio-details', {
      title: portfolio.name,
      showBackButton: true,
      portfolio,
      allStocks: allStocksResult.rows
    });
  } catch (err) {
    console.error('Error fetching portfolio details:', err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/portfolios');
  }
});

// Add a stock to a portfolio
router.post('/portfolios/:id/stocks', ensureAuthenticated, async (req, res) => {
  const portfolioId = req.params.id;
  try {
    const { stock_id, quantity, purchase_price } = req.body;
    const userId = req.user.id;

    // Verify portfolio ownership
    const portfolioResult = await db.query(
      'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      req.flash('error_msg', 'Portfolio not found.');
      return res.redirect(`/user/portfolios`);
    }

    // Add stock to portfolio
    await db.query(
      'INSERT INTO portfolio_stocks (portfolio_id, stock_id, quantity, purchase_price, purchase_date) VALUES ($1, $2, $3, $4, CURRENT_DATE)',
      [portfolioId, stock_id, quantity, purchase_price]
    );

    req.flash('success_msg', 'Stock added to portfolio successfully.');
    res.redirect(`/user/portfolios/${portfolioId}`);
  } catch (err) {
    console.error('Error adding stock to portfolio:', err);
    req.flash('error_msg', 'Error adding stock. It might already be in the portfolio.');
    res.redirect(`/user/portfolios/${portfolioId}`);
  }
});

// Remove stock from portfolio
router.delete('/portfolios/:portfolio_id/stocks/:portfolio_stock_id', ensureAuthenticated, async (req, res) => {
    const { portfolio_id, portfolio_stock_id } = req.params;
    const userId = req.user.id;

    try {
        // First, verify the user owns the portfolio
        const portfolioCheck = await db.query(
            'SELECT id FROM portfolios WHERE id = $1 AND user_id = $2',
            [portfolio_id, userId]
        );

        if (portfolioCheck.rows.length === 0) {
            req.flash('error_msg', 'You do not have permission to modify this portfolio.');
            return res.redirect('/user/portfolios');
        }

        // If ownership is confirmed, delete the stock from the portfolio
        const deleteResult = await db.query(
            'DELETE FROM portfolio_stocks WHERE id = $1 AND portfolio_id = $2',
            [portfolio_stock_id, portfolio_id]
        );

        if (deleteResult.rowCount > 0) {
            req.flash('success_msg', 'Stock removed from portfolio.');
        } else {
            req.flash('error_msg', 'Could not find the stock in this portfolio.');
        }
        res.redirect(`/user/portfolios/${portfolio_id}`);
    } catch (err) {
        console.error('Error removing stock from portfolio:', err);
        req.flash('error_msg', 'Server error while trying to remove stock.');
        res.redirect(`/user/portfolios/${portfolio_id}`);
    }
});

// Delete portfolio
router.delete('/portfolios/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if portfolio belongs to user
    const portfolio = await db.query(
      'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (portfolio.rows.length === 0) {
      req.flash('error_msg', 'Portfolio not found');
      return res.redirect('/user/portfolios');
    }
    
    // Delete portfolio (cascade will delete portfolio_stocks)
    await db.query('DELETE FROM portfolios WHERE id = $1', [id]);
    
    req.flash('success_msg', 'Portfolio deleted successfully');
    res.redirect('/user/portfolios');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/portfolios');
  }
});

// Add stock to portfolio
router.post('/portfolios/:id/add', ensureAuthenticated, async (req, res) => {
  try {
    const { portfolio_id, stock_id, quantity, purchase_price, purchase_date } = req.body;
    
    // Validate inputs
    if (!portfolio_id || !stock_id || !quantity || !purchase_price || !purchase_date) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect('/user/portfolios');
    }
    
    // Check if portfolio belongs to user
    const portfolio = await db.query(
      'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
      [portfolio_id, req.user.id]
    );
    
    if (portfolio.rows.length === 0) {
      req.flash('error_msg', 'Portfolio not found');
      return res.redirect('/user/portfolios');
    }
    
    // Add stock to portfolio
    await db.query(
      'INSERT INTO portfolio_stocks (portfolio_id, stock_id, quantity, purchase_price, purchase_date) VALUES ($1, $2, $3, $4, $5)',
      [portfolio_id, stock_id, quantity, purchase_price, purchase_date]
    );
    
    req.flash('success_msg', 'Stock added to portfolio');
    res.redirect('/user/portfolios');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/portfolios');
  }
});

// Update stock in portfolio
router.put('/portfolios/:portfolio_id/stocks/:stock_id', ensureAuthenticated, async (req, res) => {
  try {
    const { portfolio_id, stock_id } = req.params;
    const { quantity } = req.body;
    
    // Check if portfolio belongs to user
    const portfolio = await db.query(
      'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
      [portfolio_id, req.user.id]
    );
    
    if (portfolio.rows.length === 0) {
      req.flash('error_msg', 'Portfolio not found');
      return res.redirect('/user/portfolios');
    }
    
    // Update stock quantity
    await db.query(
      'UPDATE portfolio_stocks SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE portfolio_id = $2 AND id = $3',
      [quantity, portfolio_id, stock_id]
    );
    
    req.flash('success_msg', 'Stock updated in portfolio');
    res.redirect('/user/portfolios');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/portfolios');
  }
});

// Remove stock from portfolio
router.delete('/portfolios/:portfolio_id/stocks/:stock_id', ensureAuthenticated, async (req, res) => {
  try {
    const { portfolio_id, stock_id } = req.params;
    
    // Check if portfolio belongs to user
    const portfolio = await db.query(
      'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
      [portfolio_id, req.user.id]
    );
    
    if (portfolio.rows.length === 0) {
      req.flash('error_msg', 'Portfolio not found');
      return res.redirect('/user/portfolios');
    }
    
    // Remove stock from portfolio
    await db.query(
      'DELETE FROM portfolio_stocks WHERE portfolio_id = $1 AND id = $2',
      [portfolio_id, stock_id]
    );
    
    req.flash('success_msg', 'Stock removed from portfolio');
    res.redirect('/user/portfolios');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/portfolios');
  }
});

// Delete portfolio
router.delete('/portfolios/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if portfolio belongs to user
    const portfolio = await db.query(
      'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (portfolio.rows.length === 0) {
      req.flash('error_msg', 'Portfolio not found');
      return res.redirect('/user/portfolios');
    }
    
    // Delete portfolio (cascade will delete portfolio_stocks)
    await db.query('DELETE FROM portfolios WHERE id = $1', [id]);
    
    req.flash('success_msg', 'Portfolio deleted successfully');
    res.redirect('/user/portfolios');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/portfolios');
  }
});

// Dashboard routes
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    // Get user's watchlists with their stocks
    const watchlists = await db.query(
      `SELECT l.id, l.name, l.created_at, 
              li.id as item_id, li.stock_id, 
              s.symbol, s.name as stock_name, s.current_price, s.change_percent
       FROM lists l
       LEFT JOIN list_items li ON l.id = li.list_id
       LEFT JOIN stocks s ON li.stock_id = s.id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC, li.created_at ASC`,
      [req.user.id]
    );

    // Group stocks by watchlist
    const watchlistsData = [];
    let currentList = null;
    
    watchlists.rows.forEach(row => {
      if (!currentList || currentList.id !== row.id) {
        if (currentList) watchlistsData.push(currentList);
        currentList = {
          id: row.id,
          name: row.name,
          created_at: row.created_at,
          stocks: []
        };
      }
      
      if (row.stock_id) {
        currentList.stocks.push({
          id: row.stock_id,
          symbol: row.symbol,
          name: row.stock_name,
          current_price: row.current_price,
          change_percent: row.change_percent
        });
      }
    });
    
    if (currentList) {
      watchlistsData.push(currentList);
    }

    const [marketOverview, topGainers, topLosers] = await Promise.all([
      db.query('SELECT * FROM market_overview'),
      db.query('SELECT * FROM stocks ORDER BY change_percent DESC LIMIT 5'),
      db.query('SELECT * FROM stocks ORDER BY change_percent ASC LIMIT 5')
    ]);

    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      watchlists: watchlistsData,
      marketOverview: marketOverview.rows,
      topGainers: topGainers.rows,
      topLosers: topLosers.rows,
      messages: req.flash()
    });
  } catch (err) {
    console.error('Error in dashboard route:', err);
    req.flash('error_msg', 'Error loading dashboard');
    res.redirect('/');
  }
});

// Watchlist routes
router.get('/dashboard/watchlist', ensureAuthenticated, async (req, res) => {
  try {
    // Get all user's watchlists with stock count
    const watchlists = await db.query(
      `SELECT l.*, COUNT(li.id) as stock_count
       FROM lists l
       LEFT JOIN list_items li ON l.id = li.list_id
       WHERE l.user_id = $1
       GROUP BY l.id
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );

    // Get all stocks for the first watchlist if exists
    let stocks = [];
    let currentWatchlistId = null;
    
    if (watchlists.rows.length > 0) {
      currentWatchlistId = watchlists.rows[0].id;
      
      stocks = await db.query(
        `SELECT s.*, li.id as list_item_id
         FROM stocks s
         JOIN list_items li ON s.id = li.stock_id
         WHERE li.list_id = $1
         ORDER BY s.symbol`,
        [currentWatchlistId]
      );
    }

    res.render('dashboard/watchlist', {
      title: 'My Watchlists',
      watchlists: watchlists.rows,
      currentWatchlistId,
      stocks: stocks.rows,
      messages: req.flash()
    });
  } catch (err) {
    console.error('Error in watchlist route:', err);
    req.flash('error_msg', 'Error loading watchlists');
    res.redirect('/dashboard');
  }
});

// Create new watchlist
router.post('/dashboard/watchlist', ensureAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Validate input
    if (!name || name.trim() === '') {
      req.flash('error_msg', 'Watchlist name is required');
      return res.redirect('/dashboard/watchlist');
    }
    
    // Create new watchlist
    const result = await db.query(
      'INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.id, name.trim()]
    );
    
    req.flash('success_msg', 'Watchlist created successfully');
    res.redirect('/dashboard/watchlist');
  } catch (err) {
    console.error('Error creating watchlist:', err);
    req.flash('error_msg', 'Error creating watchlist');
    res.redirect('/dashboard/watchlist');
  }
});

// Add stock to watchlist
router.post('/dashboard/watchlist/:id/add', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_id } = req.body;
    
    // Check if stock is already in the watchlist
    const exists = await db.query(
      'SELECT id FROM list_items WHERE list_id = $1 AND stock_id = $2',
      [id, stock_id]
    );
    
    if (exists.rows.length > 0) {
      req.flash('error_msg', 'Stock is already in this watchlist');
      return res.redirect(`/dashboard/watchlist`);
    }
    
    // Add stock to watchlist
    await db.query(
      'INSERT INTO list_items (list_id, stock_id) VALUES ($1, $2)',
      [id, stock_id]
    );
    
    req.flash('success_msg', 'Stock added to watchlist');
    res.redirect(`/dashboard/watchlist`);
  } catch (err) {
    console.error('Error adding stock to watchlist:', err);
    req.flash('error_msg', 'Error adding stock to watchlist');
    res.redirect('/dashboard/watchlist');
  }
});

// Remove stock from watchlist
router.post('/dashboard/watchlist/:id/remove', ensureAuthenticated, async (req, res) => {
  try {
    const { list_item_id } = req.body;
    
    // Remove stock from watchlist
    await db.query('DELETE FROM list_items WHERE id = $1 AND list_id = $2', 
      [list_item_id, req.params.id]);
    
    req.flash('success_msg', 'Stock removed from watchlist');
    res.redirect(`/dashboard/watchlist`);
  } catch (err) {
    console.error('Error removing stock from watchlist:', err);
    req.flash('error_msg', 'Error removing stock from watchlist');
    res.redirect('/dashboard/watchlist');
  }
});

// Delete watchlist
router.post('/dashboard/watchlist/:id/delete', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete watchlist (cascade will delete list_items)
    await db.query('DELETE FROM lists WHERE id = $1 AND user_id = $2', 
      [id, req.user.id]);
    
    req.flash('success_msg', 'Watchlist deleted successfully');
    res.redirect('/dashboard/watchlist');
  } catch (err) {
    console.error('Error deleting watchlist:', err);
    req.flash('error_msg', 'Error deleting watchlist');
    res.redirect('/dashboard/watchlist');
  }
});

// Get watchlist stocks
router.get('/api/watchlist/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get stocks in the watchlist
    const stocks = await db.query(
      `SELECT s.*, li.id as list_item_id
       FROM stocks s
       JOIN list_items li ON s.id = li.stock_id
       WHERE li.list_id = $1
       ORDER BY s.symbol`,
      [id]
    );
    
    res.json(stocks.rows);
  } catch (err) {
    console.error('Error fetching watchlist stocks:', err);
    res.status(500).json({ error: 'Error fetching watchlist stocks' });
  }
});

// Portfolio management
router.get('/dashboard/portfolio', ensureAuthenticated, async (req, res) => {
  try {
    // Get user's portfolios
    const portfolios = await db.query(
      'SELECT * FROM portfolios WHERE user_id = $1',
      [req.user.id]
    );
    
    // Get holdings in each portfolio
    const portfoliosWithHoldings = [];
    
    for (const portfolio of portfolios.rows) {
      const holdings = await db.query(
        `SELECT h.*, s.symbol, s.name, s.current_price 
         FROM portfolio_holdings h
         JOIN stocks s ON h.stock_id = s.id
         WHERE h.portfolio_id = $1`,
        [portfolio.id]
      );
      
      // Calculate portfolio value and performance
      let totalValue = 0;
      let totalCost = 0;
      
      for (const holding of holdings.rows) {
        holding.current_value = holding.shares * holding.current_price;
        holding.total_cost = holding.shares * holding.purchase_price;
        holding.profit_loss = holding.current_value - holding.total_cost;
        holding.profit_loss_percent = (holding.profit_loss / holding.total_cost) * 100;
        
        totalValue += holding.current_value;
        totalCost += holding.total_cost;
      }
      
      portfoliosWithHoldings.push({
        ...portfolio,
        holdings: holdings.rows,
        totalValue,
        totalCost,
        totalProfitLoss: totalValue - totalCost,
        totalProfitLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
      });
    }
    
    res.render('dashboard/portfolio', {
      title: 'My Portfolios',
      portfolios: portfoliosWithHoldings
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      message: 'Error loading portfolios',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Create new portfolio
router.post('/dashboard/portfolio', ensureAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Validate input
    if (!name) {
      req.flash('error_msg', 'Please provide a name for your portfolio');
      return res.redirect('/dashboard/portfolio');
    }
    
    // Create portfolio
    await db.query(
      'INSERT INTO portfolios (user_id, name) VALUES ($1, $2)',
      [req.user.id, name]
    );
    
    req.flash('success_msg', 'Portfolio created successfully');
    res.redirect('/dashboard/portfolio');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error creating portfolio');
    res.redirect('/dashboard/portfolio');
  }
});

// Add stock to portfolio
router.post('/dashboard/portfolio/add', ensureAuthenticated, async (req, res) => {
  try {
    const { portfolio_id, stock_id, shares, purchase_price, purchase_date } = req.body;
    
    // Validate input
    if (!portfolio_id || !stock_id || !shares || !purchase_price || !purchase_date) {
      req.flash('error_msg', 'Please fill in all required fields');
      return res.redirect('/dashboard/portfolio');
    }
    
    // Add holding to portfolio
    await db.query(
      `INSERT INTO portfolio_holdings 
       (portfolio_id, stock_id, shares, purchase_price, purchase_date) 
       VALUES ($1, $2, $3, $4, $5)`,
      [portfolio_id, stock_id, shares, purchase_price, purchase_date]
    );
    
    req.flash('success_msg', 'Stock added to portfolio');
    res.redirect('/dashboard/portfolio');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error adding stock to portfolio');
    res.redirect('/dashboard/portfolio');
  }
});

// Update portfolio holding
router.put('/dashboard/portfolio/update', ensureAuthenticated, async (req, res) => {
  try {
    const { holding_id, shares, purchase_price, purchase_date } = req.body;
    
    // Validate input
    if (!holding_id || !shares || !purchase_price || !purchase_date) {
      req.flash('error_msg', 'Please fill in all required fields');
      return res.redirect('/dashboard/portfolio');
    }
    
    // Update holding
    await db.query(
      `UPDATE portfolio_holdings 
       SET shares = $1, purchase_price = $2, purchase_date = $3
       WHERE id = $4`,
      [shares, purchase_price, purchase_date, holding_id]
    );
    
    req.flash('success_msg', 'Portfolio holding updated');
    res.redirect('/dashboard/portfolio');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating portfolio holding');
    res.redirect('/dashboard/portfolio');
  }
});

// Delete portfolio holding
router.delete('/dashboard/portfolio/remove', ensureAuthenticated, async (req, res) => {
  try {
    const { holding_id } = req.body;
    
    // Delete holding
    await db.query('DELETE FROM portfolio_holdings WHERE id = $1', [holding_id]);
    
    req.flash('success_msg', 'Stock removed from portfolio');
    res.redirect('/dashboard/portfolio');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error removing stock from portfolio');
    res.redirect('/dashboard/portfolio');
  }
});

// Delete portfolio
router.delete('/dashboard/portfolio/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if portfolio belongs to user
    const portfolio = await db.query(
      'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (portfolio.rows.length === 0) {
      req.flash('error_msg', 'Portfolio not found');
      return res.redirect('/dashboard/portfolio');
    }
    
    // Delete portfolio holdings first
    await db.query('DELETE FROM portfolio_holdings WHERE portfolio_id = $1', [id]);
    
    // Delete portfolio
    await db.query('DELETE FROM portfolios WHERE id = $1', [id]);
    
    req.flash('success_msg', 'Portfolio deleted successfully');
    res.redirect('/dashboard/portfolio');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error deleting portfolio');
    res.redirect('/dashboard/portfolio');
  }
});

// Alerts management
router.get('/dashboard/alerts', ensureAuthenticated, async (req, res) => {
  try {
    // Get user's alerts
    const alerts = await db.query(
      `SELECT a.*, s.symbol, s.name 
       FROM stock_alerts a
       JOIN stocks s ON a.stock_id = s.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    // Get all stocks for dropdown
    const stocks = await db.query('SELECT id, symbol, name FROM stocks ORDER BY symbol');

    res.render('dashboard/alerts', {
      showBackButton: true,
      title: 'Price Alerts',
      alerts: alerts.rows,
      stocks: stocks.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      message: 'Error loading alerts',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Create new alert
router.post('/dashboard/alerts', ensureAuthenticated, async (req, res) => {
  try {
    const { stock_id, alert_type, price_target } = req.body;

    // Validate input
    if (!stock_id || !alert_type || !price_target) {
      req.flash('error_msg', 'Please fill in all required fields');
      return res.redirect('/dashboard/alerts');
    }

    // Create alert
    await db.query(
      `INSERT INTO stock_alerts 
       (user_id, stock_id, alert_type, price_target) 
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, stock_id, alert_type, price_target]
    );

    req.flash('success_msg', 'Alert created successfully');
    res.redirect('/dashboard/alerts');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error creating alert');
    res.redirect('/dashboard/alerts');
  }
});

// Delete alert
router.delete('/dashboard/alerts/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if alert belongs to user
    const alert = await db.query(
      'SELECT * FROM stock_alerts WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (alert.rows.length === 0) {
      req.flash('error_msg', 'Alert not found');
      return res.redirect('/dashboard/alerts');
    }

    // Delete alert
    await db.query('DELETE FROM stock_alerts WHERE id = $1', [id]);

    req.flash('success_msg', 'Alert deleted successfully');
    res.redirect('/dashboard/alerts');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error deleting alert');
    res.redirect('/dashboard/alerts');
  }
});

// Account Settings
router.get('/settings', ensureAuthenticated, async (req, res) => {
  try {
    // Get user settings from database
    const settingsResult = await db.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [req.user.id]
    );

    // If no settings found, use defaults
    const settings = settingsResult.rows[0] || {
      email_alerts: true,
      market_updates: true,
      portfolio_alerts: true,
      default_view: 'dashboard',
      price_display: 'percentage',
      theme: 'light'
    };

    res.render('user/settings', { 
      showBackButton: true,
      title: 'Account Settings',
      settings
    });
  } catch (err) {
    console.error(err);
    res.render('user/settings', { 
      showBackButton: true,
      title: 'Account Settings',
      settings: {
        email_alerts: true,
        market_updates: true,
        portfolio_alerts: true,
        default_view: 'dashboard',
        price_display: 'percentage',
        theme: 'light'
      }
    });
  }
});

// Update Notification Settings
router.post('/settings/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const emailAlerts = req.body.emailAlerts === 'on';
    const marketUpdates = req.body.marketUpdates === 'on';
    const portfolioAlerts = req.body.portfolioAlerts === 'on';
    
    // Check if user has settings
    const settingsCheck = await db.query(
      'SELECT id FROM user_settings WHERE user_id = $1',
      [req.user.id]
    );
    
    if (settingsCheck.rows.length > 0) {
      // Update existing settings
      await db.query(
        'UPDATE user_settings SET email_alerts = $1, market_updates = $2, portfolio_alerts = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4',
        [emailAlerts, marketUpdates, portfolioAlerts, req.user.id]
      );
    } else {
      // Insert new settings
      await db.query(
        'INSERT INTO user_settings (user_id, email_alerts, market_updates, portfolio_alerts) VALUES ($1, $2, $3, $4)',
        [req.user.id, emailAlerts, marketUpdates, portfolioAlerts]
      );
    }
    
    req.flash('success_msg', 'Notification settings updated successfully');
    res.redirect('/user/settings');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/settings');
  }
});

// Update Display Settings
router.post('/settings/display', ensureAuthenticated, async (req, res) => {
  try {
    const { defaultView, priceDisplay, theme } = req.body;
    
    // Check if user has settings
    const settingsCheck = await db.query(
      'SELECT id FROM user_settings WHERE user_id = $1',
      [req.user.id]
    );
    
    if (settingsCheck.rows.length > 0) {
      // Update existing settings
      await db.query(
        'UPDATE user_settings SET default_view = $1, price_display = $2, theme = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4',
        [defaultView, priceDisplay, theme, req.user.id]
      );
    } else {
      // Insert new settings
      await db.query(
        'INSERT INTO user_settings (user_id, default_view, price_display, theme) VALUES ($1, $2, $3, $4)',
        [req.user.id, defaultView, priceDisplay, theme]
      );
    }
    
    req.flash('success_msg', 'Display settings updated successfully');
    res.redirect('/user/settings');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/settings');
  }
});

// Delete Account
router.post('/delete-account', ensureAuthenticated, async (req, res) => {
  try {
    const { password } = req.body;
    
    // Check if password is correct
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    if (!user.rows[0].password) {
      req.flash('error_msg', 'You are using social login. Please contact support to delete your account.');
      return res.redirect('/user/settings');
    }
    
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    
    if (!isMatch) {
      req.flash('error_msg', 'Password is incorrect');
      return res.redirect('/user/settings');
    }
    
    // Delete user account
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    
    req.logout();
    req.flash('success_msg', 'Your account has been deleted');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/user/settings');
  }
});

export default router;