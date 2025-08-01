import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Home Page
router.get('/', (req, res) => {
    res.render('index', { 
        title: 'Home',
        activeNav: 'home'
    });
});

// About Page
router.get('/about', (req, res) => {
    res.render('about', { 
        title: 'About Us',
        activeNav: 'about'
    });
});

// Services Page
router.get('/service', (req, res) => {
    res.render('service', { 
        title: 'Our Services',
        activeNav: 'service'
    });
});

// Features Page
router.get('/feature', (req, res) => {
    res.render('feature', { 
        title: 'Our Features',
        activeNav: 'feature'
    });
});

// Team Page
router.get('/team', (req, res) => {
    res.render('team', { 
        title: 'Our Team',
        activeNav: 'team'
    });
});

// Offer Page
router.get('/offer', (req, res) => {
    // Sample offers data with placeholder images
    const offers = [
        {
            id: 'collapseOne',
            title: 'Expert Market Analysis',
            description: 'Access exclusive market analysis from our team of financial experts. Get actionable insights on market trends, stock recommendations, and investment opportunities to make informed decisions.',
            image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            active: true,
            features: [
                'Daily market reports',
                'Technical analysis',
                'Fundamental analysis',
                'Sector performance insights'
            ]
        },
        {
            id: 'collapseTwo',
            title: 'Portfolio Management',
            description: 'Our advanced portfolio tracking tools help you monitor performance, analyze risk, and optimize your investments. Visualize your asset allocation and get personalized recommendations to improve returns.',
            image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            active: false,
            features: [
                'Real-time portfolio tracking',
                'Performance analytics',
                'Risk assessment',
                'Diversification tools'
            ]
        },
        {
            id: 'collapseThree',
            title: 'Mobile Trading',
            description: 'Trade on the go with our mobile platform. Set up custom alerts for price movements, news, and market events. Never miss an opportunity with real-time notifications and instant trade execution.',
            image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            active: false,
            features: [
                'iOS and Android apps',
                'Real-time alerts',
                'One-tap trading',
                'Biometric login'
            ]
        },
        {
            id: 'collapseFour',
            title: 'Premium Benefits',
            description: 'Enjoy commission-free trading, priority customer support, and exclusive educational resources as a premium member. Upgrade your account to access our full suite of professional trading tools.',
            image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            active: false,
            features: [
                'Commission-free trades',
                'Priority support',
                'Advanced charting tools',
                'Exclusive webinars'
            ]
        }
    ];

    res.render('offer', { 
        title: 'Our Offers',
        activeNav: 'offer',
        offers: offers,
        showBackButton: true
    });
});

// FAQ Page
router.get('/faq', (req, res) => {
    // Sample FAQ data - in a real app, this would come from a database
    const faqs = [
        {
            question: 'How do I get started with stock trading?',
            answer: 'To get started, create an account, complete the verification process, deposit funds, and you can begin trading stocks through our platform.'
        },
        {
            question: 'What are the trading fees?',
            answer: 'We offer commission-free trading on stocks and ETFs. Options trades have a $0.65 per contract fee. Cryptocurrency trades have a 1% fee.'
        },
        {
            question: 'How do I deposit funds?',
            answer: 'You can deposit funds via bank transfer, wire transfer, or by linking your debit/credit card. Go to the Deposit section in your account to get started.'
        },
        {
            question: 'Is my money safe?',
            answer: 'Yes, we use bank-level security and encryption to protect your funds. Client securities are held in segregated accounts at regulated banks.'
        },
        {
            question: 'What investment options are available?',
            answer: 'You can trade stocks, ETFs, options, and cryptocurrencies. We also offer managed portfolios and retirement accounts.'
        },
        {
            question: 'How do I contact customer support?',
            answer: 'You can reach our support team 24/7 via live chat in the app, email at support@stocker.com, or by phone at (800) 123-4567.'
        }
    ];

    res.render('faq', { 
        title: 'FAQs',
        activeNav: 'faq',
        faqs: faqs,
        showBackButton: true
    });
});

// Contact Page
router.get('/contact', (req, res) => {
    res.render('contact', { 
        title: 'Contact Us',
        activeNav: 'contact',
        showBackButton: true
    });
});

// Terms of Service Page
router.get('/terms', (req, res) => {
    res.render('terms', { 
        title: 'Terms of Service',
        activeNav: '',
        showBackButton: true
    });
});

// Privacy Policy Page
router.get('/privacy', (req, res) => {
    res.render('privacy', { 
        title: 'Privacy Policy',
        activeNav: '',
        showBackButton: true
    });
});

// Dashboard Page (Protected)
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

        // Default portfolio data in case of errors
        let portfolio = {
            totalValue: 0,
            totalGain: 0,
            totalInvested: 0,
            totalGainPercent: 0,
            dayChange: 0,
            dayChangePercent: 0,
            topHolding: null
        };

        try {
            // Try to get portfolio data if the table exists
            const portfolioResult = await db.query(
                `SELECT 
                    COALESCE(SUM(p.quantity * s.current_price), 0) as total_value,
                    COALESCE(SUM(p.quantity * (s.current_price - p.average_price)), 0) as total_gain,
                    COALESCE(SUM(p.quantity * p.average_price), 0) as total_invested
                 FROM portfolio p
                 JOIN stocks s ON p.stock_id = s.id
                 WHERE p.user_id = $1`,
                [req.user.id]
            );

            // Get top holding
            const topHolding = await db.query(
                `SELECT s.symbol, s.name, s.current_price, s.change_percent
                 FROM portfolio p
                 JOIN stocks s ON p.stock_id = s.id
                 WHERE p.user_id = $1
                 ORDER BY (p.quantity * s.current_price) DESC
                 LIMIT 1`,
                [req.user.id]
            );

            // Calculate portfolio metrics if we have data
            if (portfolioResult.rows.length > 0) {
                const portfolioData = portfolioResult.rows[0];
                portfolio = {
                    totalValue: parseFloat(portfolioData.total_value),
                    totalGain: parseFloat(portfolioData.total_gain),
                    totalInvested: parseFloat(portfolioData.total_invested) || 1, // Avoid division by zero
                    totalGainPercent: portfolioData.total_invested > 0 
                        ? (parseFloat(portfolioData.total_gain) / parseFloat(portfolioData.total_invested)) * 100 
                        : 0,
                    dayChange: 0, // This would require historical data
                    dayChangePercent: 0, // This would require historical data
                    topHolding: topHolding.rows[0] ? {
                        symbol: topHolding.rows[0].symbol,
                        name: topHolding.rows[0].name,
                        price: parseFloat(topHolding.rows[0].current_price),
                        changePercent: parseFloat(topHolding.rows[0].change_percent)
                    } : null
                };
            }
        } catch (portfolioError) {
            console.warn('Portfolio data not available:', portfolioError.message);
            // Continue with default portfolio data
        }

        // Get market data
        const [marketOverview, topGainers, topLosers] = await Promise.all([
            db.query('SELECT * FROM stocks WHERE is_index = true ORDER BY market_cap DESC LIMIT 10'),
            db.query('SELECT * FROM stocks ORDER BY change_percent DESC NULLS LAST LIMIT 5'),
            db.query('SELECT * FROM stocks ORDER BY change_percent ASC NULLS LAST LIMIT 5')
        ]);

        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user,
            watchlists: watchlistsData,
            portfolio: portfolio,
            marketOverview: marketOverview.rows,
            topGainers: topGainers.rows,
            topLosers: topLosers.rows,
            messages: req.flash()
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        req.flash('error_msg', 'Error loading dashboard data');
        res.redirect('/');
    }
});

export default router;