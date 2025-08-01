const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Parse and modify connection string if needed
let connectionString = process.env.DATABASE_URL;
if (connectionString) {
  connectionString = connectionString.replace('-pooler', '');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Neon PostgreSQL
  }
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Running database migrations...');
    
    // The main schema.sql is a reference. Migrations are the source of truth.
    
    // Run all migration files
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Run in alphabetical order
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(migrationSql);
    }
    
    await client.query('COMMIT');
    console.log('Database setup completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);
