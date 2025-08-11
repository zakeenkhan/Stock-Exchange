import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const { Pool, Client } = pg;

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  password: process.env.DB_PASSWORD || 'Zakeen123@',
  port: process.env.DB_PORT || 4000,
};

const targetDatabase = process.env.DB_NAME || 'stoker';

async function createDatabaseIfNotExists() {
  // Connect to postgres database to create target database
  const client = new Client({
    ...dbConfig,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDatabase]
    );

    if (result.rows.length === 0) {
      console.log(`Creating database: ${targetDatabase}`);
      await client.query(`CREATE DATABASE "${targetDatabase}"`);
      console.log(`Database ${targetDatabase} created successfully`);
    } else {
      console.log(`Database ${targetDatabase} already exists`);
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

async function setupSchema() {
  // Connect to the target database
  const pool = new Pool({
    ...dbConfig,
    database: targetDatabase
  });

  try {
    console.log(`Connecting to database: ${targetDatabase}`);
    const client = await pool.connect();

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('Creating database schema...');
    await client.query(schemaSQL);
    console.log('Schema created successfully');

    client.release();
  } catch (err) {
    console.error('Error setting up schema:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    console.log('=== Database Setup ===');
    console.log(`Target database: ${targetDatabase}`);
    console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`User: ${dbConfig.user}`);
    
    await createDatabaseIfNotExists();
    await setupSchema();
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Open: http://localhost:3001');
    
  } catch (err) {
    console.error('\n❌ Database setup failed:', err.message);
    console.log('\nPlease check:');
    console.log('1. PostgreSQL is running');
    console.log('2. Your .env file has correct database credentials');
    console.log('3. You have permission to create databases');
    process.exit(1);
  }
}

main();
