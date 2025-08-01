import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import db from '../config/database.js';
import stockEducationController from '../controllers/stockEducationController.js';

const router = express.Router();

// Stock search
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.render('stock/search', { 
        title: 'Search Stocks',
        stocks: [],
        searchPerformed: false,
        showBackButton: true
      });
    }
    
    // Search stocks by symbol or name
    const stocks = await db.query(
      `SELECT * FROM stocks 
       WHERE LOWER(symbol) LIKE LOWER($1) 
       OR LOWER(company_name) LIKE LOWER($1)
       ORDER BY market_cap DESC`,
      [`%${query}%`]
    );
    
    res.render('stock/search', { 
      title: 'Search Results',
      stocks: stocks.rows,
      searchPerformed: true,
      query,
      showBackButton: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Stock search API
router.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    // Search by symbol or name
    const results = await db.query(
      `SELECT * FROM stocks 
       WHERE symbol ILIKE $1 OR name ILIKE $1 
       ORDER BY CASE 
         WHEN symbol ILIKE $2 THEN 0
         WHEN symbol ILIKE $3 THEN 1
         WHEN name ILIKE $2 THEN 2
         ELSE 3
       END
       LIMIT 10`,
      [`%${q}%`, `${q}%`, `${q}%`]
    );
    
    res.json(results.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error searching stocks' });
  }
});

// Education and Analytics Routes
router.get('/education', stockEducationController.getEducationalResources);
router.get('/analytics', ensureAuthenticated, stockEducationController.getAnalytics);
router.get('/market-data', ensureAuthenticated, stockEducationController.getMarketData);

// API Routes

// Get all stocks - Moved before /:symbol to avoid route conflict
router.get('/all', async (req, res) => {
  try {
    // Get all stocks with calculated change field
    const stocksQuery = `
      SELECT 
        id, 
        symbol, 
        name, 
        company_name, 
        current_price, 
        change_percent,
        (current_price * change_percent / 100) as change,
        market_cap, 
        volume, 
        sector, 
        is_index
      FROM stocks 
      ORDER BY symbol ASC
    `;
    
    const stocks = await db.query(stocksQuery);
    
    let lists = [];
    if (req.isAuthenticated()) {
      try {
        const listsResult = await db.query(
          'SELECT * FROM lists WHERE user_id = $1 ORDER BY name ASC', 
          [req.user.id]
        );
        lists = listsResult.rows;
      } catch (listError) {
        console.error('Error fetching user watchlists:', listError);
        // Continue without watchlists if there's an error
      }
    }

    // Format the stocks data with proper defaults
    const formattedStocks = stocks.rows.map(stock => ({
      ...stock,
      change: stock.change || 0, // Ensure change has a default value
      change_percent: stock.change_percent || 0,
      current_price: stock.current_price || 0,
      market_cap: stock.market_cap || 0,
      volume: stock.volume || 0
    }));

    res.render('stock/all', { 
      showBackButton: true,
      title: 'All Stocks', 
      stocks: formattedStocks, 
      lists,
      user: req.user // Make sure user is passed to the template
    });
  } catch (err) {
    console.error('Error in /stock/all route:', {
      message: err.message,
      stack: err.stack,
      query: err.query
    });
    
    // Render error page with more details in development
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { message: err.message, stack: err.stack } 
      : {};
      
    res.status(500).render('error', { 
      message: 'Error loading stocks. Please try again later.',
      error: errorDetails
    });
  }
});

// Individual stock route - Moved after /all to avoid conflict
router.get('/:symbol', ensureAuthenticated, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Get stock details
    const stock = await db.query('SELECT * FROM stocks WHERE symbol = $1', [symbol.toUpperCase()]);
    
    if (stock.rows.length === 0) {
      req.flash('error_msg', 'Stock not found');
      return res.redirect('/stock/all');
    }

    // Get related news
    const news = await db.query(
      `SELECT n.* FROM news n
       JOIN stock_news sn ON n.id = sn.news_id
       JOIN stocks s ON sn.stock_id = s.id
       WHERE s.symbol = $1
       ORDER BY n.published_at DESC
       LIMIT 5`,
      [symbol.toUpperCase()]
    );

    // Get user's lists and portfolios for the sidebar
    const [lists, portfolios] = await Promise.all([
      db.query('SELECT * FROM lists WHERE user_id = $1 ORDER BY name ASC', [req.user.id]),
      db.query('SELECT * FROM portfolios WHERE user_id = $1 ORDER BY name ASC', [req.user.id])
    ]);

    // Initialize historical data with empty arrays as default
    let historicalData = { labels: [], prices: [] };
    
    try {
      // Try to get historical data if the table exists
      const result = await db.query(
        `SELECT date, close_price 
         FROM historical_data 
         WHERE stock_id = $1 
         AND date >= NOW() - INTERVAL '30 days' 
         ORDER BY date ASC`,
        [stock.rows[0].id]
      );
      
      if (result.rows.length > 0) {
        historicalData = {
          labels: result.rows.map(row => new Date(row.date).toLocaleDateString()),
          prices: result.rows.map(row => row.close_price)
        };
      }
    } catch (err) {
      // If the table doesn't exist or there's an error, we'll use the empty arrays
      console.warn('Could not fetch historical data:', err.message);
    }

    res.render('stock/details_final', { 
      showBackButton: true,
      stock: stock.rows[0],
      news: news.rows || [],
      lists: lists.rows || [],
      portfolios: portfolios.rows || [],
      historicalData: historicalData,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });

  } catch (err) {
    console.error('Error in stock details route:', err);
    req.flash('error_msg', 'Error loading stock details. Please try again.');
    res.redirect('/stock/all');
  }
});

// Get stock data
router.get('/api/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Get stock details
    const stock = await db.query(
      'SELECT * FROM stocks WHERE symbol = $1',
      [symbol.toUpperCase()]
    );
    
    if (stock.rows.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    res.json(stock.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get market overview data
router.get('/api/market/overview', async (req, res) => {
  try {
    // Get top stocks by market cap
    const topStocks = await db.query(
      'SELECT * FROM stocks ORDER BY market_cap DESC LIMIT 10'
    );
        
    // Get biggest gainers
    const gainers = await db.query(`
      SELECT *,
        CASE 
          WHEN price_change IS NOT NULL THEN price_change
          ELSE 0
        END as percent_change
      FROM stocks
      WHERE price_change > 0
      ORDER BY price_change DESC
      LIMIT 5
    `);
        
    // Get biggest losers
    const losers = await db.query(`
      SELECT *,
        CASE 
          WHEN price_change IS NOT NULL THEN price_change
          ELSE 0
        END as percent_change
      FROM stocks
      WHERE price_change < 0
      ORDER BY price_change ASC
      LIMIT 5
    `);
        
    res.json({
      topStocks: topStocks.rows,  
      gainers: gainers.rows,
      losers: losers.rows
    });
  } catch (err) {
    console.error('Error in /api/market/overview:', err);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Add stock to watchlist (API)
router.post('/api/watchlist/add', ensureAuthenticated, async (req, res) => {
  try {
    const { watchlist_id, stock_id } = req.body;
    
    // Input validation
    if (!watchlist_id || !stock_id) {
      console.log('Missing required fields:', { watchlist_id, stock_id });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: watchlist_id and stock_id are required' 
      });
    }
    
    // Check if watchlist exists and belongs to user
    const listResult = await db.query(
      'SELECT id FROM lists WHERE id = $1 AND user_id = $2',
      [watchlist_id, req.user.id]
    );
    
    if (listResult.rows.length === 0) {
      console.log('Watchlist not found or unauthorized:', { watchlist_id, userId: req.user.id });
      return res.status(404).json({ 
        success: false, 
        error: 'Watchlist not found or you do not have permission to modify it' 
      });
    }
    
    // Check if stock exists
    const stockResult = await db.query(
      'SELECT id FROM stocks WHERE id = $1',
      [stock_id]
    );
    
    if (stockResult.rows.length === 0) {
      console.log('Stock not found:', { stock_id });
      return res.status(404).json({ 
        success: false, 
        error: 'Stock not found' 
      });
    }
    
    // Check if stock is already in the watchlist
    const existingItem = await db.query(
      'SELECT id FROM list_items WHERE list_id = $1 AND stock_id = $2',
      [watchlist_id, stock_id]
    );
    
    if (existingItem.rows.length > 0) {
      console.log('Stock already in watchlist:', { watchlist_id, stock_id });
      return res.status(409).json({ 
        success: false, 
        error: 'This stock is already in the selected watchlist' 
      });
    }
    
    // Add stock to watchlist
    await db.query(
      'INSERT INTO list_items (list_id, stock_id, created_at) VALUES ($1, $2, NOW())',
      [watchlist_id, stock_id]
    );
    
    console.log('Successfully added stock to watchlist:', { watchlist_id, stock_id, userId: req.user.id });
    
    // Get updated stock data to return
    const updatedStock = await db.query(
      `SELECT s.*, 
              (SELECT name FROM lists WHERE id = $1) as list_name
       FROM stocks s
       WHERE s.id = $2`,
      [watchlist_id, stock_id]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Stock added to watchlist successfully',
      stock: updatedStock.rows[0],
      watchlist: {
        id: watchlist_id,
        name: updatedStock.rows[0]?.list_name || 'My Watchlist'
      }
    });
    
  } catch (err) {
    console.error('Error adding stock to watchlist:', err);
    res.status(500).json({ 
      success: false, 
      error: 'An error occurred while adding the stock to the watchlist',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Remove stock from watchlist (API)
router.delete('/api/watchlist/remove', ensureAuthenticated, async (req, res) => {
  try {
    const { watchlist_id, stock_id } = req.body;
    
    if (!watchlist_id || !stock_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if watchlist belongs to user
    const watchlist = await db.query(
      'SELECT * FROM watchlists WHERE id = $1 AND user_id = $2',
      [watchlist_id, req.user.id]
    );
    
    if (watchlist.rows.length === 0) {
      return res.status(403).json({ error: 'Watchlist not found or unauthorized' });
    }
    
    // Remove stock from watchlist
    await db.query(
      'DELETE FROM watchlist_stocks WHERE watchlist_id = $1 AND stock_id = $2',
      [watchlist_id, stock_id]
    );
    
    res.json({ success: true, message: 'Stock removed from watchlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add stock to portfolio (API)
router.post('/api/portfolio/add', ensureAuthenticated, async (req, res) => {
  try {
    const { portfolio_id, stock_id, quantity, purchase_price, purchase_date } = req.body;
    
    if (!portfolio_id || !stock_id || !quantity || !purchase_price || !purchase_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if portfolio belongs to user
    const portfolio = await db.query(
      'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
      [portfolio_id, req.user.id]
    );
    
    if (portfolio.rows.length === 0) {
      return res.status(403).json({ error: 'Portfolio not found or unauthorized' });
    }
    
    // Add stock to portfolio
    const result = await db.query(
      'INSERT INTO portfolio_stocks (portfolio_id, stock_id, quantity, purchase_price, purchase_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [portfolio_id, stock_id, quantity, purchase_price, purchase_date]
    );
    
    res.json({ 
      success: true, 
      message: 'Stock added to portfolio',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update stock in portfolio (API)
router.put('/api/portfolio/update', ensureAuthenticated, async (req, res) => {
  try {
    const { portfolio_stock_id, quantity } = req.body;
    
    if (!portfolio_stock_id || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get portfolio_stock to check ownership
    const portfolioStock = await db.query(`
      SELECT ps.*, p.user_id 
      FROM portfolio_stocks ps
      JOIN portfolios p ON ps.portfolio_id = p.id
      WHERE ps.id = $1
    `, [portfolio_stock_id]);
    
    if (portfolioStock.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio stock not found' });
    }
    
    if (portfolioStock.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update stock quantity
    const result = await db.query(
      'UPDATE portfolio_stocks SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [quantity, portfolio_stock_id]
    );
    
    res.json({
      success: true,
      message: 'Stock updated in portfolio',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get watchlist list API (for AJAX)
router.get('/dashboard/watchlist/list', ensureAuthenticated, async (req, res) => {
  try {
    const lists = await db.query(
      'SELECT id, name FROM lists WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json(lists.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching watchlists' });
  }
});

// AJAX API for creating watchlist
router.post('/dashboard/watchlist', ensureAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Watchlist name is required' });
    }
    
    const result = await db.query(
      'INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING id',
      [req.user.id, name]
    );
    
    res.json({ success: true, watchlist_id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error creating watchlist' });
  }
});

// AJAX API for adding stock to watchlist
router.post('/dashboard/watchlist/add', ensureAuthenticated, async (req, res) => {
  try {
    const { watchlist_id, stock_id } = req.body;
    
    if (!watchlist_id || !stock_id) {
      return res.status(400).json({ success: false, error: 'Missing required information' });
    }
    
    // Check if watchlist belongs to user
    const watchlist = await db.query(
      'SELECT * FROM watchlists WHERE id = $1 AND user_id = $2',
      [watchlist_id, req.user.id]
    );
    
    if (watchlist.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    // Check if stock already in watchlist
    const existing = await db.query(
      'SELECT * FROM watchlist_items WHERE watchlist_id = $1 AND stock_id = $2',
      [watchlist_id, stock_id]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ success: false, error: 'Stock already in watchlist' });
    }
    
    // Add stock to watchlist
    await db.query(
      'INSERT INTO watchlist_items (watchlist_id, stock_id) VALUES ($1, $2)',
      [watchlist_id, stock_id]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error adding stock to watchlist' });
  }
});

// Market Data Page
router.get('/market-data', async (req, res) => {
  try {
    // Get top stocks by market cap
    const topStocks = await db.query(`
      SELECT 
        s.*,
        COALESCE(s.price_change, 0) as price_change_percent,
        COALESCE(s.trading_volume, 0) as daily_volume
      FROM stocks s
      WHERE s.current_price > 0
      ORDER BY s.market_cap DESC NULLS LAST
      LIMIT 20
    `);
    
    // Get market indices
    const indices = await db.query(`
      SELECT 
        s.*,
        s.current_price as value,
        COALESCE(s.price_change, 0) as change,
        s.updated_at as last_updated
      FROM stocks s
      WHERE s.is_index = true
      ORDER BY s.updated_at DESC NULLS LAST
      LIMIT 10
    `);
    
    res.render('stock/market-data', {
      title: 'Market Data',
      activeNav: 'stock',
      topStocks: topStocks.rows,
      indices: indices.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      message: 'Error loading market data',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Analytics Page
router.get('/analytics', async (req, res) => {
  try {
    // Get trending stocks
    const trendingStocks = await db.query(`
      SELECT 
        s.*,
        COALESCE(s.price_change, 0) as change_percent,
        COALESCE(s.trading_volume, 0) as volume,
        CASE 
          WHEN s.price_change > 0 THEN 'up'
          WHEN s.price_change < 0 THEN 'down'
          ELSE 'neutral'
        END as trend
      FROM stocks s
      ORDER BY s.trading_volume DESC NULLS LAST
      LIMIT 10
    `);
    
    // Get recent market analysis
    const marketAnalysis = await db.query(`
      SELECT 
        s.symbol,
        s.name,
        s.current_price,
        COALESCE(s.price_change, 0) as change_percent,
        s.updated_at as analysis_date,
        CASE 
          WHEN s.price_change > 0 THEN 'Bullish'
          WHEN s.price_change < 0 THEN 'Bearish'
          ELSE 'Neutral'
        END as sentiment
      FROM stocks s
      WHERE s.current_price > 0
      ORDER BY s.updated_at DESC
      LIMIT 5
    `);
    
    res.render('stock/analytics', {
      title: 'Stock Analytics',
      activeNav: 'stock',
      trendingStocks: trendingStocks.rows,
      marketAnalysis: marketAnalysis.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      message: 'Error loading analytics',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Educational Resources Page
router.get('/education', async (req, res) => {
  try {
    // Initialize with empty arrays in case of errors
    let articles = { rows: [] };
    let videos = { rows: [] };
    
    try {
      // Get educational articles if table exists
      articles = await db.query(
        `SELECT * FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'educational_content'`
      );
      
      if (articles.rows.length > 0) {
        articles = await db.query(
          'SELECT * FROM educational_content WHERE is_published = true ORDER BY published_at DESC LIMIT 10'
        );
      } else {
        console.log('Educational content table does not exist. Running in fallback mode.');
      }
      
      // Get video tutorials if table exists
      const videoTableCheck = await db.query(
        `SELECT * FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'video_tutorials'`
      );
      
      if (videoTableCheck.rows.length > 0) {
        videos = await db.query(
          'SELECT * FROM video_tutorials WHERE is_published = true ORDER BY published_at DESC LIMIT 6'
        );
      } else {
        console.log('Video tutorials table does not exist. Running in fallback mode.');
      }
    } catch (dbError) {
      console.error('Database error in education route:', dbError);
      // Continue with empty results
    }
    
    // Use mock data if no articles or videos found
    const mockArticles = [
      {
        id: 1,
        title: 'Getting Started with Stock Market',
        content: 'Learn the basics of stock market investing...',
        category: 'Beginner',
        published_at: new Date().toISOString()
      }
    ];
    
    const mockVideos = [
      {
        id: 1,
        title: 'Introduction to Stock Market',
        description: 'Learn the basics of how the stock market works',
        video_url: 'https://www.youtube.com/embed/example1',
        thumbnail_url: '/img/service-1.jpg',
        duration: '10:25',
        category: 'Basics'
      }
    ];
    
    res.render('stock/education', {
      title: 'Educational Resources',
      activeNav: 'stock',
      articles: articles.rows.length > 0 ? articles.rows : mockArticles,
      videos: videos.rows.length > 0 ? videos.rows : mockVideos,
      showFallback: articles.rows.length === 0 && videos.rows.length === 0
    });
  } catch (err) {
    console.error('Error in education route:', err);
    res.status(500).render('error', {
      title: 'Error - Stoker',
      message: 'Error loading educational resources',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

export default router;