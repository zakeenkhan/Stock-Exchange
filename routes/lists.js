import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Create a new list
router.post('/create', ensureAuthenticated, async (req, res) => {
    const { name, description } = req.body;
    const user_id = req.user.id;

    if (!name) {
        req.flash('error_msg', 'Please provide a name for the list.');
        return res.redirect('/dashboard');
    }

    try {
        await db.query(
            'INSERT INTO lists (user_id, name, description) VALUES ($1, $2, $3)',
            [user_id, name, description]
        );
        req.flash('success_msg', 'New list created successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error creating list:', err);
        req.flash('error_msg', 'Something went wrong. Please try again.');
        res.redirect('/dashboard');
    }
});

// View a specific list
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const listId = parseInt(req.params.id, 10);
        console.log('Fetching list with ID:', listId);

        if (isNaN(listId)) {
            console.error('Invalid list ID provided');
            req.flash('error_msg', 'Invalid list ID.');
            return res.redirect('/dashboard');
        }
        const userId = req.user.id;

        // Get list details
        const listResult = await db.query(
            'SELECT * FROM lists WHERE id = $1 AND user_id = $2',
            [listId, userId]
        );
        console.log('List query result:', listResult.rows);

        if (listResult.rows.length === 0) {
            console.error('List not found or permission denied');
            req.flash('error_msg', 'List not found or you do not have permission to view it.');
            return res.redirect('/dashboard');
        }

        // Get stocks in the list
        const stocksResult = await db.query(`
            SELECT 
                s.id, s.symbol, s.name, s.current_price, 
                li.list_id, li.created_at AS added_at,
                s.change_value,
                s.change_percent
            FROM list_items li
            INNER JOIN stocks s ON li.stock_id = s.id
            WHERE li.list_id = $1
            ORDER BY li.created_at DESC
        `, [listId]);
        
        console.log('Stocks in list:', stocksResult.rows);

        res.render('list-details', {
            title: `${listResult.rows[0].name} - Watchlist`,
            list: listResult.rows[0],
            stocks: stocksResult.rows,
            user: req.user,
            pageTitle: listResult.rows[0].name,
            showBackButton: true
        });

    } catch (err) {
        console.error('Error fetching list details:', err);
        req.flash('error_msg', 'Error loading the list. Please try again.');
        res.redirect('/dashboard');
    }
});

// Add a stock to a list
router.post('/add-stock', ensureAuthenticated, async (req, res) => {
    const { list_id, stock_id } = req.body;
    const user_id = req.user.id;

    if (!list_id || !stock_id) {
        return res.status(400).json({ success: false, message: 'Missing list or stock information.' });
    }

    try {
        // Verify the list belongs to the user
        const listResult = await db.query(
            'SELECT id FROM lists WHERE id = $1 AND user_id = $2',
            [list_id, user_id]
        );

        if (listResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You do not have permission to modify this list.' });
        }

        // Check if the stock is already in the list
        const existingItem = await db.query(
            'SELECT id FROM list_items WHERE list_id = $1 AND stock_id = $2',
            [list_id, stock_id]
        );

        if (existingItem.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'This stock is already in the list.' });
        }

        // Add the stock to the list
        await db.query(
            'INSERT INTO list_items (list_id, stock_id) VALUES ($1, $2)',
            [list_id, stock_id]
        );

        res.json({ success: true, message: 'Stock added to the list successfully!' });

    } catch (err) {
        console.error('Error adding stock to list:', err);
        res.status(500).json({ success: false, message: 'An internal error occurred. Please try again.' });
    }
});

// Get user's lists (JSON)
router.get('/api', ensureAuthenticated, async (req, res) => {
  try {
    const lists = await db.query(
      'SELECT id, name, description, created_at FROM lists WHERE user_id = $1 ORDER BY name ASC',
      [req.user.id]
    );
    res.json(lists.rows);
  } catch (err) {
    console.error('Error fetching user lists:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch lists' });
  }
});

// Add a stock to a list (JSON)
router.post('/api/add-item', ensureAuthenticated, async (req, res) => {
  const { list_id, stock_id } = req.body;
  const user_id = req.user.id;

  if (!list_id || !stock_id) {
    return res.status(400).json({ success: false, message: 'Missing list_id or stock_id' });
  }

  try {
    // Verify the list belongs to the user
    const listResult = await db.query(
      'SELECT id FROM lists WHERE id = $1 AND user_id = $2',
      [list_id, user_id]
    );
    if (listResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this list' });
    }

    // Check if the stock exists
    const stockResult = await db.query('SELECT id FROM stocks WHERE id = $1', [stock_id]);
    if (stockResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }

    // Avoid duplicate
    const existing = await db.query(
      'SELECT id FROM list_items WHERE list_id = $1 AND stock_id = $2',
      [list_id, stock_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Stock already in this list' });
    }

    // Insert
    await db.query(
      'INSERT INTO list_items (list_id, stock_id, created_at) VALUES ($1, $2, NOW())',
      [list_id, stock_id]
    );

    res.status(201).json({ success: true, message: 'Added to list' });
  } catch (err) {
    console.error('Error adding item to list (API):', err);
    res.status(500).json({ success: false, message: 'Failed to add item to list' });
  }
});

export default router;
