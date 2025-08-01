import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 4000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the database connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected successfully');
  }
});

// Function to check required tables
async function checkRequiredTables() {
  try {
    const requiredTables = ['stocks', 'educational_content', 'video_tutorials'];
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1::text[])
    `, [requiredTables]);
    
    const existingTables = result.rows.map(row => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.error('WARNING: The following required tables are missing:', missingTables);
      console.log('Please run the database setup script to create these tables.');
    } else {
      console.log('All required database tables exist.');
    }
    
    return missingTables.length === 0;
  } catch (err) {
    console.error('Error checking database tables:', err);
    return false;
  }
}

// Test connection with retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

async function testConnection(retries = MAX_RETRIES) {
  try {
    console.log('Attempting to connect to database...');
    const client = await pool.connect();
    console.log('Connected to Neon PostgreSQL database');
    client.release();
    return true;
  } catch (err) {
    console.error('Error connecting to database:', err.message);
    console.error('Error details:', err);
    
    if (retries > 0) {
      console.log(`Retrying connection in ${RETRY_DELAY/1000} seconds... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return testConnection(retries - 1);
    } else {
      console.error('Failed to connect to database after multiple attempts');
      return false;
    }
  }
}

// Export query method for database operations
export const query = (text, params) => pool.query(text, params);

// Export getClient for transactions
export const getClient = async () => {
  const client = await pool.connect();
  
  // Set a timeout to release the client after 5 seconds
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
    console.error(new Error().stack);
  }, 5000);
  
  // Override the release method to clear the timeout
  const release = client.release;
  client.release = () => {
    clearTimeout(timeout);
    release.apply(client);
  };
  
  return client;
};

// Export all necessary items
export { pool, testConnection, checkRequiredTables };

export default {
  query,
  getClient,
  pool,
  testConnection,
  checkRequiredTables
};