import type Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import path from "path";
import { openEncryptedDatabase } from "@/lib/security/sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "interviewprep.sqlite");

export type UserDriveToken = {
  userId: string;
  refreshToken: string;
  googleEmail: string | null;
  updatedAt: string;
};

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = openEncryptedDatabase(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_drive_tokens (
      user_id TEXT PRIMARY KEY,
      refresh_token TEXT NOT NULL,
      google_email TEXT,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export function getUserDriveToken(userId: string): UserDriveToken | null {
  const row = getDb()
    .prepare("SELECT * FROM user_drive_tokens WHERE user_id = ?")
    .get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    userId: String(row.user_id),
    refreshToken: String(row.refresh_token),
    googleEmail: row.google_email ? String(row.google_email) : null,
    updatedAt: String(row.updated_at),
  };
}

export function upsertUserDriveToken(input: {
  userId: string;
  refreshToken: string;
  googleEmail?: string | null;
}) {
  getDb()
    .prepare(
      `INSERT INTO user_drive_tokens (user_id, refresh_token, google_email, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         refresh_token = excluded.refresh_token,
         google_email = COALESCE(excluded.google_email, user_drive_tokens.google_email),
         updated_at = excluded.updated_at`,
    )
    .run(
      input.userId,
      input.refreshToken,
      input.googleEmail || null,
      new Date().toISOString(),
    );
}

export function deleteUserDriveToken(userId: string) {
  getDb()
    .prepare("DELETE FROM user_drive_tokens WHERE user_id = ?")
    .run(userId);
}
