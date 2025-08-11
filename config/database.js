import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database configuration - prioritize DATABASE_URL for cloud services like NeonDB
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL for cloud services like NeonDB
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for NeonDB and other cloud PostgreSQL services
    }
  };
} else {
  // Use individual environment variables for local development
  dbConfig = {
    user: String(process.env.DB_USER || 'postgres'),
    host: String(process.env.DB_HOST || 'localhost'),
    database: String(process.env.DB_NAME || 'stoker'),
    password: String(process.env.DB_PASSWORD || ''),
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

// Log configuration (without sensitive data) for debugging
console.log('Database config:', {
  type: process.env.DATABASE_URL ? 'CONNECTION_STRING' : 'INDIVIDUAL_PARAMS',
  host: process.env.DATABASE_URL ? 'FROM_CONNECTION_STRING' : dbConfig.host,
  database: process.env.DATABASE_URL ? 'FROM_CONNECTION_STRING' : dbConfig.database,
  port: process.env.DATABASE_URL ? 'FROM_CONNECTION_STRING' : dbConfig.port,
  ssl: dbConfig.ssl ? 'ENABLED' : 'DISABLED'
});

const pool = new Pool(dbConfig);

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
    console.log('Connected to PostgreSQL database');
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