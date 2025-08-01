const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function addStockColumns() {
    try {
        // Read and execute the SQL file
        const sql = fs.readFileSync(
            path.join(__dirname, 'migrations', 'add_stock_analytics_columns.sql'),
            'utf8'
        );
        
        await pool.query(sql);
        console.log('Stock analytics columns added successfully!');
    } catch (err) {
        console.error('Error adding stock analytics columns:', err);
    } finally {
        await pool.end();
    }
}

addStockColumns();
