const { Pool } = require('pg');
require('dotenv').config();

async function checkTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace('-pooler', ''),
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stocks'
      ORDER BY ordinal_position
    `);
    
    console.log('Stocks table columns:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error checking table structure:', err);
  } finally {
    await pool.end();
  }
}

checkTable().catch(console.error);
