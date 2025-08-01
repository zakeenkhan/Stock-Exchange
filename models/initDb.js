const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Function to initialize database
const initializeDb = async () => {
  try {
    console.log('Initializing database...');
    
    // Test database connection first
    await db.testConnection();
    console.log('Database connection successful');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    
    // Check if schema file exists
    if (!fs.existsSync(schemaPath)) {
      console.error('Schema file not found at:', schemaPath);
      console.log('Please create the schema.sql file in the database directory');
      process.exit(1);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements (MySQL doesn't support multiple statements in one query by default)
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement.trim());
      }
    }
    console.log('Database schema created successfully');
    
    // Insert default admin user if doesn't exist
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check if admin exists (PostgreSQL syntax)
    const adminCheck = await db.query('SELECT * FROM users WHERE email = $1', ['admin@stocker.com']);
    
    if (adminCheck.rows.length === 0) {
      await db.query(
        'INSERT INTO users (name, email, password, is_verified, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['Admin User', 'admin@stocker.com', hashedPassword, true, true]
      );
      console.log('Default admin user created');
      console.log('Admin credentials:');
      console.log('Email: admin@stocker.com');
      console.log('Password: admin123');
    } else {
      console.log('Admin user already exists');
    }
    
    // Insert default FAQs if not exist
    // Check if faqs table exists first
    const tableExists = await db.query("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'faqs');");
    if (!tableExists.rows[0].exists) {
      console.log('FAQs table does not exist. Skipping FAQ insertion.');
    } else {
      const faqCheck = await db.query('SELECT COUNT(*) FROM faqs');
      const faqCount = parseInt(faqCheck.rows[0].count);
      
      if (faqCount === 0) {
      const defaultFaqs = [
        {
          question: 'What Does This Tool Do?',
          answer: 'Stocker is a comprehensive stock market tool that helps investors track, analyze, and manage their investment portfolios. It provides real-time market data, portfolio management, watchlists, and investment analysis tools.'
        },
        {
          question: 'What Are The Disadvantages Of Online Trading?',
          answer: 'While online trading offers convenience and lower fees, there are disadvantages including increased risk of impulsive trading, technical issues, security concerns, information overload, and lack of professional guidance for new investors.'
        },
        {
          question: 'Is Online Trading Safe?',
          answer: 'Online trading can be safe when using reputable platforms with strong security measures. Stocker uses industry-standard encryption and authentication protocols to protect user data and transactions. However, all investing carries inherent market risks.'
        },
        {
          question: 'What Is Online Trading, And How Does It Work?',
          answer: 'Online trading allows investors to buy and sell financial securities through internet-based platforms. It works by connecting users to exchanges through brokerages, providing market data and executing trades electronically without the need for phone calls or in-person visits.'
        },
        {
          question: 'Which App Is Best For Online Trading?',
          answer: 'The best trading app depends on your needs. Stocker offers a comprehensive solution with real-time data, portfolio management, watchlists, and analysis tools. Our platform is designed to be user-friendly while providing powerful features for both beginners and experienced traders.'
        },
        {
          question: 'How To Create A Trading Account?',
          answer: 'To create a Stocker account: 1) Click "Register" in the top menu, 2) Fill out your personal information, 3) Verify your email address, 4) Set up your security preferences, 5) Complete any additional verification if required, and 6) Fund your account to start trading.'
        }
      ];
      
      for (let i = 0; i < defaultFaqs.length; i++) {
        await db.query(
          'INSERT INTO faqs (question, answer, order_number) VALUES ($1, $2, $3)',
          [defaultFaqs[i].question, defaultFaqs[i].answer, i + 1]
        );
      }
      console.log('Default FAQs created');
    } else {
      console.log('FAQs already exist');
    }
    
    console.log('Database initialization completed successfully');
    
  } catch (error) {
    console.error('Error initializing database:', err);
    console.error('Stack trace:', err.stack);
    
    // Provide helpful error messages
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection refused. Please check:');
      console.error('1. MySQL server is running');
      console.error('2. Database credentials in .env file');
      console.error('3. Database exists and is accessible');
    } else if (err.code === 'ER_NO_SUCH_TABLE') {
      console.error('Table does not exist. Please check your schema.sql file');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('Database does not exist. Please create the database first');
    }
    
    process.exit(1);
  }
};

// Only run initialization if this file is executed directly
if (require.main === module) {
  initializeDb();
}

module.exports = initializeDb;