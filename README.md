# Stoker — Stock Market Platform
The Stock Tracking Web Application is a full-stack project developed using Node.js, Express, EJS, and PostgreSQL. It is designed to help users monitor stock market trends, manage personal portfolios, and create customized watchlists within an intuitive and responsive interface.

Users can browse market data, track the performance of specific stocks, and organize them into watchlists for quick access. The system also allows portfolio management, where users can record their investments, analyze gains/losses, and maintain an overview of their financial positions.

The backend is powered by Node.js and Express, ensuring fast and scalable server-side logic, while PostgreSQL is used for reliable and structured data storage. The frontend, built with EJS templates, provides a clean and responsive UI that adapts across devices, making it easy for users to stay informed about their investments in real time.

This project demonstrates practical applications of full-stack web development, database management, and financial data visualization, making it a strong example of both technical and domain-specific problem solving.

## Features

- Local + Google OAuth login (Passport)
- Stock search and browse
- Watchlists and portfolio tracking
- Bootstrap UI, flash messages, sessions

## Quick Start

1) Install
```
git clone <repo-url>
cd Stoker
npm install
```

2) Create `.env`
```
PORT=3004
SESSION_SECRET=your_session_secret
DATABASE_URL=postgres://user:password@host:5432/dbname
# Optional (for Google Sign‑In)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3004/auth/google/callback
```

3) Migrate DB
```
node database/runMigration.js
```

4) Run
```
npm start  # http://localhost:3004
# or for auto‑reload
npm run dev
```

## Project

- Entry: `app.js` (Express, middleware, EJS, routes)
- Views: `views/` (e.g., `views/partials/header.ejs`)
- Routes: `routes/` (e.g., `routes/priceAlerts.js`)
- DB: `database/migrations/*.sql`, `database/runMigration.js`
- Static: `/css`, `/lib`, `/img`, `/js`

## Deployment (brief)

- Any Node host (Render/Railway/Heroku). Start command: `node app.js`.
- Set env vars: `PORT` (if required by host), `SESSION_SECRET`, `DATABASE_URL`, and Google OAuth vars if used.
- Run migrations once after deploy: `node database/runMigration.js`.
- Update the Live Demo URL above.

## Screenshots / Media

<p align="center">
  <img src="screenshorts/1.JPG" alt="Screenshot 1" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
  <img src="screenshorts/3.JPG" alt="Screenshot 3" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
  <br/>
  <img src="screenshorts/4.JPG" alt="Screenshot 4" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
  <img src="screenshorts/6.JPG" alt="Screenshot 6" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
  <br/>
  <img src="screenshorts/7.JPG" alt="Screenshot 7" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
  <img src="screenshorts/8.JPG" alt="Screenshot 8" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
  <br/>
  <img src="screenshorts/9.JPG" alt="Screenshot 9" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
  <img src="screenshorts/10.JPG" alt="Screenshot 10" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
  <br/>
  <img src="screenshorts/dashboard.JPG" alt="Dashboard" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
  <img src="screenshorts/dashboard2.JPG" alt="Dashboard 2" width="45%" style="border:1px solid #ddd;border-radius:8px;padding:4px;background:#fff;margin:6px;box-shadow:0 2px 6px rgba(0,0,0,.08);" />
</p>

## License

ISC — see `LICENSE.txt`.
