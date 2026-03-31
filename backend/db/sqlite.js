import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const configuredDbPath = process.env.DB_PATH || "./data/app.db";
const absoluteDbPath = path.resolve(process.cwd(), configuredDbPath);

fs.mkdirSync(path.dirname(absoluteDbPath), { recursive: true });

export const db = new Database(absoluteDbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT PRIMARY KEY,
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    badges TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
  )
`);

console.log(`[DB] SQLite connected: ${absoluteDbPath}`);
console.log("[DB] Table ready: user_progress");
