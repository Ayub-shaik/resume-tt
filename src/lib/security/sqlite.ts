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
export function openEncryptedDatabase(
  filePath: string,
  options?: { key?: Buffer },
): SqliteDatabase {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const key = options?.key ?? resolveDataAtRestKey();
  const plaintext = isPlaintextSqliteFile(filePath);
  const db = new Database(filePath);

  try {
    if (plaintext) {
      // rekey is unsupported in WAL mode — checkpoint + DELETE first
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
      } catch {
        // ignore on new DB
      }
      db.pragma("journal_mode = DELETE");
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
  db.pragma("busy_timeout = 5000");
  return db;
}

/** Plain SQLite (no SQLCipher). Used for the shared allowlist so Python can open it. */
export function openPlainDatabase(filePath: string): SqliteDatabase {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  return db;
}

/**
 * If `filePath` is still SQLCipher-encrypted, dump `allowlist` rows into a
 * new plaintext file (legacy `.enc.bak` kept beside it).
 */
export function decryptAllowlistToPlaintext(
  filePath: string,
  key: Buffer,
): void {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 16) return;
  if (isPlaintextSqliteFile(filePath)) return;

  const enc = new Database(filePath);
  let rows: Array<{ email: string; added_by: string | null; created_at: string }> =
    [];
  try {
    enc.key(key);
    enc.prepare("SELECT 1").get();
    try {
      enc.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      // ignore
    }
    try {
      rows = enc
        .prepare("SELECT email, added_by, created_at FROM allowlist")
        .all() as Array<{
        email: string;
        added_by: string | null;
        created_at: string;
      }>;
    } catch {
      rows = [];
    }
  } catch (err) {
    try {
      enc.close();
    } catch {
      // ignore
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to decrypt shared allowlist at ${filePath}. Check AUTH_ALLOWLIST_KEY. (${msg})`,
    );
  }
  enc.close();

  const bak = `${filePath}.enc.bak`;
  const tmp = `${filePath}.plain.tmp`;
  for (const extra of ["", "-wal", "-shm"]) {
    const src = `${filePath}${extra}`;
    if (fs.existsSync(src)) {
      fs.renameSync(src, `${bak}${extra}`);
    }
  }
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

  const plain = new Database(tmp);
  try {
    plain.exec(`
      CREATE TABLE IF NOT EXISTS allowlist (
        email TEXT PRIMARY KEY,
        added_by TEXT,
        created_at TEXT NOT NULL
      );
    `);
    const ins = plain.prepare(
      `INSERT INTO allowlist (email, added_by, created_at) VALUES (?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    );
    const tx = plain.transaction(() => {
      for (const r of rows) {
        const email = String(r.email || "")
          .trim()
          .toLowerCase();
        if (!email.includes("@")) continue;
        ins.run(email, r.added_by || "migrate", r.created_at);
      }
    });
    tx();
    plain.pragma("journal_mode = DELETE");
  } finally {
    plain.close();
  }
  fs.renameSync(tmp, filePath);
}
