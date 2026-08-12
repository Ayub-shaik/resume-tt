import fs from "fs";
import path from "path";
import { scryptSync } from "crypto";
import Database from "better-sqlite3-multiple-ciphers";

export type SqliteDatabase = Database.Database;

/**
 * Operator key for SQLite at-rest encryption.
 * Prefer DATA_AT_REST_KEY (64-char hex or passphrase).
 * Production: fail-closed if unset.
 * Dev/test: may derive from AUTH_SECRET (never use that in prod).
 */
export function resolveDataAtRestKey(): Buffer {
  const raw =
    process.env.DATA_AT_REST_KEY?.trim() ||
    process.env.SQLITE_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "DATA_AT_REST_KEY must be set in production (SQLite encryption fail-closed)",
      );
    }
    const seed =
      process.env.AUTH_SECRET?.trim() ||
      process.env.NEXTAUTH_SECRET?.trim() ||
      "dev-only-at-rest-key-change-me";
    return scryptSync(seed, "tomorrowtools-sqlite-v1", 32);
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return scryptSync(raw, "tomorrowtools-sqlite-v1", 32);
}

/** Plaintext SQLite files start with this header; encrypted pages do not. */
export function isPlaintextSqliteFile(filePath: string): boolean {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 16) {
    return true; // new / empty → treat as needing encrypt-on-open
  }
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    return buf.subarray(0, 15).toString("utf8") === "SQLite format 3";
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Open (or create) a database encrypted with SQLite3MultipleCiphers.
 * Plaintext files are migrated in-place via rekey on first open.
 */
export function openEncryptedDatabase(filePath: string): SqliteDatabase {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const key = resolveDataAtRestKey();
  const plaintext = isPlaintextSqliteFile(filePath);
  const db = new Database(filePath);

  try {
    if (plaintext) {
      // Checkpoint WAL before converting a live plaintext DB.
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
      } catch {
        // ignore on new DB
      }
      db.rekey(key);
      db.prepare("SELECT 1").get();
    } else {
      db.key(key);
      db.prepare("SELECT 1").get();
    }
  } catch (err) {
    try {
      db.close();
    } catch {
      // ignore
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to open encrypted SQLite at ${filePath}. Check DATA_AT_REST_KEY. (${msg})`,
    );
  }

  db.pragma("journal_mode = WAL");
  return db;
}
