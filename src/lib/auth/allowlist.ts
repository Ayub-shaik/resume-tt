import fs from "fs";
import path from "path";
import { scryptSync } from "crypto";
import {
  decryptAllowlistToPlaintext,
  isPlaintextSqliteFile,
  openEncryptedDatabase,
  openPlainDatabase,
  resolveDataAtRestKey,
  type SqliteDatabase,
} from "@/lib/security/sqlite";

export type AllowlistRow = {
  email: string;
  addedBy: string | null;
  createdAt: string;
};

let allowlistDb: SqliteDatabase | null = null;

function resolveAllowlistKey() {
  const raw = process.env.AUTH_ALLOWLIST_KEY?.trim();
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
    return scryptSync(raw, "tomorrowtools-sqlite-v1", 32);
  }
  if (process.env.AUTH_ALLOWLIST_DB?.trim()) {
    const secret =
      process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
    if (secret) return scryptSync(secret, "tomorrowtools-sqlite-v1", 32);
  }
  return resolveDataAtRestKey();
}

export function resolveAllowlistDbPath(): string {
  const configured = process.env.AUTH_ALLOWLIST_DB?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data", "interviewprep.sqlite");
}

export function getAllowlistDb(): SqliteDatabase {
  if (allowlistDb) return allowlistDb;
  const filePath = resolveAllowlistDbPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const shared = Boolean(process.env.AUTH_ALLOWLIST_DB?.trim());
  if (shared) {
    if (!isPlaintextSqliteFile(filePath)) {
      decryptAllowlistToPlaintext(filePath, resolveAllowlistKey());
    }
    allowlistDb = openPlainDatabase(filePath);
  } else {
    allowlistDb = openEncryptedDatabase(filePath, { key: resolveAllowlistKey() });
  }
  allowlistDb.exec(`
    CREATE TABLE IF NOT EXISTS allowlist (
      email TEXT PRIMARY KEY,
      added_by TEXT,
      created_at TEXT NOT NULL
    );
  `);
  return allowlistDb;
}

export function importAllowlistRows(
  rows: Array<{
    email: string;
    addedBy?: string | null;
    createdAt?: string;
  }>,
) {
  const db = getAllowlistDb();
  const ins = db.prepare(
    `INSERT INTO allowlist (email, added_by, created_at) VALUES (?, ?, ?)
     ON CONFLICT(email) DO NOTHING`,
  );
  const tx = db.transaction(
    (
      items: Array<{
        email: string;
        addedBy?: string | null;
        createdAt?: string;
      }>,
    ) => {
      for (const r of items) {
        const email = String(r.email || "")
          .trim()
          .toLowerCase();
        if (!email.includes("@")) continue;
        ins.run(
          email,
          r.addedBy || "migrate",
          r.createdAt || new Date().toISOString(),
        );
      }
    },
  );
  tx(rows);
}

export function isEmailAllowed(email: string): boolean {
  const row = getAllowlistDb()
    .prepare("SELECT email FROM allowlist WHERE email = ?")
    .get(email.toLowerCase());
  return Boolean(row);
}

export function listAllowlist(): AllowlistRow[] {
  return (
    getAllowlistDb()
      .prepare("SELECT * FROM allowlist ORDER BY created_at ASC")
      .all() as Array<Record<string, unknown>>
  ).map((r) => ({
    email: String(r.email),
    addedBy: r.added_by ? String(r.added_by) : null,
    createdAt: String(r.created_at),
  }));
}

export function addAllowlistEmail(email: string, addedBy: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Invalid email");
  getAllowlistDb()
    .prepare(
      `INSERT INTO allowlist (email, added_by, created_at) VALUES (?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    )
    .run(normalized, addedBy, new Date().toISOString());
  return listAllowlist();
}

export function removeAllowlistEmail(email: string) {
  getAllowlistDb()
    .prepare("DELETE FROM allowlist WHERE email = ?")
    .run(email.toLowerCase());
  return listAllowlist();
}
