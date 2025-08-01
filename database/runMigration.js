const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Get the migration file from command line arguments
const migrationFileName = process.argv[2];
if (!migrationFileName) {
  console.error('Please provide a migration file name.');
  process.exit(1);
}

const migrationFile = path.join(__dirname, 'migrations', migrationFileName);
if (!fs.existsSync(migrationFile)) {
    console.error(`Migration file not found: ${migrationFile}`);
    process.exit(1);
}

const sql = fs.readFileSync(migrationFile, 'utf8');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log(`Running migration: ${migrationFileName}`);
    
    await client.query(sql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();