# Stoker — Stock Market Platform

Stock tracking web app built with Node.js, Express, EJS, and PostgreSQL. Create watchlists, manage portfolios, and browse market data in a responsive UI.

## Live Demo

- https://your-live-demo-url.example.com
  - Replace after deployment (see Deployment).

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

Video demo:

[Website demo (MP4)](img/Website demo.mp4)

## License

ISC — see `LICENSE.txt`.