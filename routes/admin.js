import express from 'express';
import db from '../config/database.js';
import { ensureAdmin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Show add stock page
// @route   GET /admin/add-stock
router.get('/add-stock', ensureAdmin, (req, res) => {
    res.render('admin/add-stock', {
        page: 'add-stock',
        layout: './layouts/main',
        user: req.user,
        showBackButton: true
    });
});

// @desc    Process add stock form
// @route   POST /admin/add-stock
router.post('/add-stock', ensureAdmin, async (req, res) => {
    const {
        symbol,
        name,
        company_name,
        current_price,
        change_percent,
        market_cap,
        volume,
        sector,
        is_index
    } = req.body;

    try {
        // Handle empty strings for numeric fields by converting them to null
        const price = current_price ? parseFloat(current_price) : null;
        const mCap = market_cap ? parseInt(market_cap, 10) : null;
        const vol = volume ? parseInt(volume, 10) : null;
        const change = change_percent ? parseFloat(change_percent) : null;

        const newStock = await db.query(
            `INSERT INTO stocks (symbol, name, company_name, current_price, change_percent, market_cap, volume, sector, is_index) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [symbol.toUpperCase(), name, company_name, price, change, mCap, vol, sector, is_index === 'on']
        );

        req.flash('success_msg', 'Stock added successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        // Check for unique violation error (PostgreSQL error code 23505)
        if (err.code === '23505') {
            req.flash('error_msg', 'A stock with this symbol already exists');
        } else {
            req.flash('error_msg', 'Error adding stock');
        }
        res.redirect('/admin/add-stock');
    }
});

export default router;
