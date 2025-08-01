const db = require('../config/database');

const addDescriptionColumn = async () => {
    console.log('Attempting to add "description" column to "lists" table...');
    try {
        const query = 'ALTER TABLE lists ADD COLUMN IF NOT EXISTS description TEXT';
        await db.query(query);
        console.log('Successfully added or verified "description" column in "lists" table.');
    } catch (err) {
        console.error('Error altering table:', err.stack);
    } finally {
        // It's better not to end the pool in a script if the main app uses it continuously.
        // The script will exit and the connection will be terminated anyway.
        // If you must, ensure the db object has an `end` method.
        if (db && typeof db.end === 'function') {
            db.end();
        }
    }
};

addDescriptionColumn();
