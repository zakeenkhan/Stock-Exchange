const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTables() {
  const client = await pool.connect();
  try {
    // Check if lists table exists
    const listsTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lists'
      );
    `);

    // Check if list_items table exists
    const listItemsTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
      );
    `);

    console.log('Database Tables Status:');
    console.log('----------------------');
    console.log('lists table exists:', listsTable.rows[0].exists);
    console.log('list_items table exists:', listItemsTable.rows[0].exists);

    if (listsTable.rows[0].exists) {
      const listCount = await client.query('SELECT COUNT(*) FROM lists');
      console.log('\nTotal watchlists in database:', parseInt(listCount.rows[0].count));
    }

  } catch (err) {
    console.error('Error checking database tables:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
