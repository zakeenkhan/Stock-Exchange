import { query } from '../config/database.js';

// Educational content data
const educationalContent = {
  videos: [
    {
      id: 1,
      title: 'Introduction to Stock Market',
      description: 'Learn the basics of how the stock market works',
      thumbnail_url: '/img/service-1.jpg',
      video_url: 'https://www.youtube.com/watch?v=example1',
      duration: '10:25',
      category: 'Basics'
    },
    {
      id: 2,
      title: 'Technical Analysis Fundamentals',
      description: 'Understanding charts and technical indicators',
      thumbnail_url: '/img/service-2.jpg',
      video_url: 'https://www.youtube.com/watch?v=example2',
      duration: '15:30',
      category: 'Technical Analysis'
    },
    {
      id: 3,
      title: 'Fundamental Analysis',
      description: 'Learn how to analyze company financials',
      thumbnail_url: '/img/service-3.jpg',
      video_url: 'https://www.youtube.com/watch?v=example3',
      duration: '12:45',
      category: 'Fundamental Analysis'
    }
  ],
  articles: [
    {
      id: 1,
      title: 'How to Read Stock Charts',
      content: 'A comprehensive guide to understanding stock charts...',
      category: 'Technical Analysis',
      read_time: '5 min'
    },
    {
      id: 2,
      title: 'Understanding P/E Ratio',
      content: 'Learn what P/E ratio means and how to use it...',
      category: 'Fundamental Analysis',
      read_time: '4 min'
    }
  ]
};

// Get educational content
const getEducationalResources = async (req, res) => {
  try {
    res.render('education/index', {
      title: 'Stock Market Education',
      activeNav: 'education',
      videos: educationalContent.videos,
      articles: educationalContent.articles
    });
  } catch (err) {
    console.error('Error getting educational resources:', err);
    req.flash('error_msg', 'Error loading educational resources');
    res.redirect('/dashboard');
  }
};

// Get single educational video
const getEducationalVideo = async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const video = educationalContent.videos.find(v => v.id === videoId);
    
    if (!video) {
      req.flash('error_msg', 'Video not found');
      return res.redirect('/education');
    }
    
    res.render('education/video', {
      title: video.title,
      activeNav: 'education',
      video
    });
  } catch (err) {
    console.error('Error getting educational video:', err);
    req.flash('error_msg', 'Error loading video');
    res.redirect('/education');
  }
};

// Get single educational article
const getEducationalArticle = async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    const article = educationalContent.articles.find(a => a.id === articleId);
    
    if (!article) {
      req.flash('error_msg', 'Article not found');
      return res.redirect('/education');
    }
    
    res.render('education/article', {
      title: article.title,
      activeNav: 'education',
      article
    });
  } catch (err) {
    console.error('Error getting educational article:', err);
    req.flash('error_msg', 'Error loading article');
    res.redirect('/education');
  }
};

// Get market data
const getMarketData = async (req, res) => {
  try {
    // Example market data - replace with actual database queries
    const topGainers = await query(
      'SELECT * FROM stocks ORDER BY change_percent DESC LIMIT 5'
    );
    
    const topLosers = await query(
      'SELECT * FROM stocks ORDER BY change_percent ASC LIMIT 5'
    );
    
    const mostActive = await query(
      'SELECT * FROM stocks ORDER BY volume DESC LIMIT 5'
    );
    
    res.json({
      success: true,
      data: {
        topGainers: topGainers.rows,
        topLosers: topLosers.rows,
        mostActive: mostActive.rows
      }
    });
  } catch (err) {
    console.error('Error getting market data:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching market data'
    });
  }
};

// Get analytics data
const getAnalytics = async (req, res) => {
  try {
    // Example analytics data - replace with actual database queries
    const portfolioPerformance = await query(
      `SELECT date, SUM(value) as total_value 
       FROM portfolio_history 
       WHERE user_id = $1 
       GROUP BY date 
       ORDER BY date DESC 
       LIMIT 30`,
      [req.user.id]
    );
    
    const watchlistPerformance = await query(
      `SELECT wl.name, COUNT(ws.stock_id) as stock_count
       FROM watchlists wl
       LEFT JOIN watchlist_stocks ws ON wl.id = ws.watchlist_id
       WHERE wl.user_id = $1
       GROUP BY wl.id, wl.name`,
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: {
        portfolioPerformance: portfolioPerformance.rows,
        watchlistPerformance: watchlistPerformance.rows
      }
    });
  } catch (err) {
    console.error('Error getting analytics:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data'
    });
  }
};

export default {
  getEducationalResources,
  getEducationalVideo,
  getEducationalArticle,
  getMarketData,
  getAnalytics
};
