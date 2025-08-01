import { query } from '../config/database.js';

export const getAllAlerts = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT pa.*, u.name as user_name, s.symbol as stock_symbol
       FROM price_alerts pa
       JOIN users u ON pa.user_id = u.id
       JOIN stocks s ON pa.stock_id = s.id
       ORDER BY pa.created_at DESC`
    );
    res.render('price_alerts', { alerts: rows });
  } catch (err) {
    console.error('Error getting price alerts:', err.message);
    res.status(500).render('error', {
      message: 'Error loading price alerts',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
};

export const createAlert = async (req, res) => {
  const { user_id, stock_id, alert_type, target_price } = req.body;
  
  // Input validation
  if (!user_id || !stock_id || !alert_type || !target_price) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  try {
    const { rows } = await query(
      `INSERT INTO price_alerts (user_id, stock_id, alert_type, target_price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, stock_id, alert_type, target_price]
    );
    
    res.status(201).json({
      success: true,
      data: rows[0],
      message: 'Price alert created successfully'
    });
  } catch (err) {
    console.error('Error creating price alert:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error creating price alert',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Export all functions as named exports
export default {
  getAllAlerts,
  createAlert
};
