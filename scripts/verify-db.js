const { Pool } = require('pg');
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

async function verifyTables() {
  const client = await pool.connect();
  try {
    console.log('Verifying database tables...');
    
    // Check if tables exist
    const tables = ['stocks', 'educational_content', 'video_tutorials'];
    
    for (const table of tables) {
      try {
        const res = await client.query(
          `SELECT column_name, data_type 
           FROM information_schema.columns 
           WHERE table_name = $1`,
          [table]
        );
        
        if (res.rows.length > 0) {
          console.log(`\nTable: ${table}`);
          console.log('Columns:');
          res.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
          });
        } else {
          console.log(`\nTable '${table}' does not exist or has no columns`);
        }
      } catch (err) {
        console.error(`Error checking table ${table}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error verifying database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyTables().catch(console.error);
