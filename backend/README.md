# ASTRAFORGE Backend

This folder contains a beginner-friendly Node.js + Express backend for local development.

## Features

- Express server with CORS + JSON parsing
- Password hashing with bcrypt
- In-memory user storage (no database)
- API routes:
  - `POST /signup`
  - `POST /login`
  - `POST /save`
  - `GET /data/:username`
  - `GET /health`

## Run locally

```bash
cd backend
npm install
npm run start
```

The server runs on `http://localhost:3001`.

## Important note

Data is stored in memory. It will reset whenever the server restarts.
