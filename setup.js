/**
 * Database Setup Script
 * 
 * This script initializes the database schema and adds sample data.
 * Run this script after setting up your .env file with proper database credentials.
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Create connection pool with connection timeout and retry logic
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon PostgreSQL
  },
  max: 5, // Reduce max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Read schema file from database/schema.sql
const schemaSQL = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');

// Function to hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Setup database
async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    console.log('Creating tables...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create tables
    await client.query(schemaSQL);
    
    // Check if admin user exists
    const adminCheck = await client.query('SELECT * FROM users WHERE email = $1', ['admin@stocker.com']);
    
    if (adminCheck.rows.length === 0) {
      console.log('Creating admin user...');
      const hashedPassword = await hashPassword('admin123');
      
      // Create admin user
      await client.query(
        'INSERT INTO users (name, email, password, is_verified, is_admin) VALUES ($1, $2, $3, $4, $5)',
        ['Admin User', 'admin@stocker.com', hashedPassword, true, true]
      );
    }
    
    // Add sample stocks if they don't exist
    const stocksCheck = await client.query('SELECT COUNT(*) FROM stocks');
    
    if (parseInt(stocksCheck.rows[0].count) === 0) {
      console.log('Adding sample stocks...');
      
      const sampleStocks = [
        ['AAPL', 'Apple Inc.', 175.50, 174.20, 2850000000000, 75000000, 180.00, 170.00, 198.00, 124.00, 28.5, 0.60],
        ['MSFT', 'Microsoft Corporation', 380.20, 378.50, 2820000000000, 25000000, 385.00, 375.00, 390.00, 245.00, 35.2, 0.80],
        ['GOOGL', 'Alphabet Inc.', 140.50, 139.80, 1750000000000, 28000000, 142.00, 138.00, 150.00, 85.00, 25.8, 0.00],
        ['AMZN', 'Amazon.com Inc.', 145.20, 143.80, 1500000000000, 45000000, 147.00, 142.00, 155.00, 80.00, 60.5, 0.00],
        ['TSLA', 'Tesla, Inc.', 245.80, 240.50, 780000000000, 120000000, 250.00, 240.00, 380.00, 120.00, 70.2, 0.00]
      ];
      
      for (const stock of sampleStocks) {
        await client.query(
          'INSERT INTO stocks (symbol, company_name, current_price, previous_close, market_cap, volume, day_high, day_low, week_high_52, week_low_52, pe_ratio, dividend_yield) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          stock
        );
      }
    }
    
    // Add sample news if they don't exist
    const newsCheck = await client.query('SELECT COUNT(*) FROM news');
    
    if (parseInt(newsCheck.rows[0].count) === 0) {
      console.log('Adding sample news articles...');
      
      const sampleNews = [
        ['Apple Announces New iPhone 15', 'Apple Inc. unveiled its latest iPhone with revolutionary features and improved battery life.', 'TechCrunch', 'https://example.com/news/apple-iphone15', 'https://example.com/images/iphone15.jpg', '2023-09-12 10:00:00'],
        ['Microsoft Expands Cloud Services', 'Microsoft announced expansion of Azure cloud services with new AI capabilities.', 'CNBC', 'https://example.com/news/microsoft-cloud', 'https://example.com/images/azure.jpg', '2023-09-10 14:30:00'],
        ['Tesla Delivers Record Number of Vehicles', 'Tesla reported record deliveries in the last quarter, exceeding analyst expectations.', 'Reuters', 'https://example.com/news/tesla-deliveries', 'https://example.com/images/tesla.jpg', '2023-09-08 09:15:00']
      ];
      
      for (const news of sampleNews) {
        await client.query(
          'INSERT INTO news (title, summary, source, url, image_url, published_at) VALUES ($1, $2, $3, $4, $5, $6)',
          news
        );
      }
    }
    
    // Add sample FAQs if they don't exist
    const faqsCheck = await client.query('SELECT COUNT(*) FROM faqs');
    
    if (parseInt(faqsCheck.rows[0].count) === 0) {
      console.log('Adding sample FAQs...');
      
      const sampleFAQs = [
        ['How do I create an account?', 'To create an account, click on the "Register" button in the top right corner of the homepage. Fill in your details and follow the instructions.', 1],
        ['How do I add stocks to my watchlist?', 'After logging in, go to the stock details page and click on the "Add to Watchlist" button. You can create a new watchlist or add to an existing one.', 2],
        ['How do I track my portfolio performance?', 'After adding stocks to your portfolio with purchase information, go to the Dashboard and select "My Portfolio" to view performance metrics and charts.', 3],
        ['Is my financial information secure?', 'Yes, we use industry-standard encryption and security practices to protect your data. We never share your financial information with third parties.', 4],
        ['Can I use Stocker on mobile devices?', 'Yes, Stocker is fully responsive and works on all modern mobile devices and tablets.', 5]
      ];
      
      for (const faq of sampleFAQs) {
        await client.query(
          'INSERT INTO faqs (question, answer, order_number) VALUES ($1, $2, $3)',
          faq
        );
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Database setup completed successfully!');
    console.log('You can now log in with:');
    console.log('Email: admin@stocker.com');
    console.log('Password: admin123');
    
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error setting up database:', err);
    throw err;
  } finally {
    // Release client back to pool
    client.release();
    // Close pool
    await pool.end();
  }
}

// Run setup
setupDatabase()
  .then(() => {
    console.log('Setup completed, exiting...');
    process.exit(0);
  })
  .catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
  });