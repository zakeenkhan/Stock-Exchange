-- Drop watchlist related tables if they exist
DROP TABLE IF EXISTS list_items CASCADE;
DROP TABLE IF EXISTS lists CASCADE;

-- If there are any foreign key constraints or other dependencies, you might need to drop them first
-- For example:
-- ALTER TABLE some_other_table DROP CONSTRAINT IF EXISTS fk_list_id;
