# Stocker - Stock Market Platform

A comprehensive stock market platform built with Node.js, Express, EJS, and PostgreSQL. Stocker allows users to track stocks, create watchlists, manage portfolios, and analyze market data.

## Features

- **User Authentication**: Secure login/register with both local and Google OAuth
- **Stock Search**: Find stocks by company name or symbol
- **Watchlists**: Create and manage watchlists to track your favorite stocks
- **Portfolio Management**: Track your investments, purchases, and performance
- **Market Data**: View real-time stock prices, market trends, and news
- **Interactive Dashboard**: Personalized dashboard for monitoring market and portfolio
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database (Local or cloud-based like Neon)
- Google OAuth credentials (for Google Sign-In)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd stoker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Server configuration
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=your_session_secret

   # Database configuration (Neon PostgreSQL)
   DATABASE_URL=postgres://your_username:your_password@your-neon-db-url/your_db_name
   DB_HOST=your-neon-db-host
   DB_PORT=5432
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=your_db_name

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```

4. Initialize the database:
   ```
   npm run init-db
   ```

5. Start the application:
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

6. Access the application at `http://localhost:3000`

## Default Admin Access

After initializing the database, you can log in with the following credentials:
- Email: admin@stocker.com
- Password: admin123

## Database Structure

The application uses PostgreSQL with the following main tables:
- `users`: User accounts and authentication data
- `stocks`: Stock information and real-time data
- `watchlists`: User watchlists
- `watchlist_stocks`: Junction table for stocks in watchlists
- `portfolios`: User portfolios
- `portfolio_stocks`: Junction table for stocks in portfolios with purchase information
- `news`: Stock-related news articles

- `faqs`: Frequently asked questions

## Technology Stack

- **Backend**: Node.js, Express
- **Frontend**: EJS templates, Bootstrap 5, JavaScript
- **Database**: PostgreSQL (Neon)
- **Authentication**: Passport.js (Local + Google OAuth)
- **ORM**: None (Raw SQL with pg pool)
- **Other**: bcrypt (password hashing), express-session, connect-flash

## License

This project is licensed under the ISC License.

## Acknowledgments

- HTML template by HTML Codex
- Stock data should be integrated with a real financial data API in production 