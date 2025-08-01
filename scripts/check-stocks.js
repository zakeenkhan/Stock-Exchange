const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Get database connection string from environment variables
const connectionString = process.env.DATABASE_URL?.replace('-pooler', '');

if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Neon PostgreSQL
  }
});

async function checkStocks() {
  try {
    console.log('Connecting to database...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Successfully connected to database');
    
    // Get count of stocks
    const countResult = await pool.query('SELECT COUNT(*) FROM stocks');
    console.log(`Number of stocks in database: ${countResult.rows[0].count}`);
    
    // Get sample of stocks
    const sampleResult = await pool.query('SELECT * FROM stocks LIMIT 5');
    console.log('Sample of stocks:');
    console.log(sampleResult.rows);
    
  } catch (error) {
    console.error('Error checking stocks:', error);
  } finally {
    await pool.end();
  }
}

checkStocks();
