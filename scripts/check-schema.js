const db = require('../config/database');

const checkTableSchema = async (tableName) => {
    console.log(`Checking schema for table: ${tableName}`);
    try {
        const query = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position;
        `;
        const res = await db.query(query, [tableName]);

        if (res.rows.length === 0) {
            console.log(`Table '${tableName}' not found or has no columns.`);
        } else {
            console.table(res.rows);
        }
    } catch (err) {
        console.error('Error checking table schema:', err.stack);
    } finally {
        db.end();
        console.log('Database connection closed.');
    }
};

// Check the 'lists' table
checkTableSchema('lists');
