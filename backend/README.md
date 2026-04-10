# ASTRAFORGE Backend

Node.js + Express backend with SQLite persistence for authentication and gamification progress.

## Features

- Express server with CORS + JSON parsing
- Password hashing with bcrypt
- Persistent user credentials in SQLite (`user_credentials`)
- SQLite auto-initialization via `better-sqlite3`
- Automatic table creation: `user_progress`
- Existing routes remain available:
  - `POST /signup`
  - `POST /login`
  - `POST /save`
  - `GET /data/:username`
  - `GET /health`
- New progress routes:
  - `GET /api/progress/:userId`
  - `POST /api/progress/:userId`
  - `POST /api/progress/:userId/add-xp`

## Environment

Copy `.env.example` to `.env` and update if needed:

```bash
PORT=5000
DB_PATH=./data/app.db
```

The SQLite file is stored at `backend/data/app.db` by default.

## Run locally

```bash
cd backend
npm install
npm run dev
```

Server runs on `http://localhost:5000` unless `PORT` is changed.
