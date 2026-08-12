import type Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { openEncryptedDatabase } from "@/lib/security/sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "interviewprep.sqlite");

export type AppUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: "admin" | "user";
  createdAt: string;
};

export type AllowlistRow = {
  email: string;
  addedBy: string | null;
  createdAt: string;
};

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = openEncryptedDatabase(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS allowlist (
      email TEXT PRIMARY KEY,
      added_by TEXT,
      created_at TEXT NOT NULL
    );
  `);
  // Migration: password login for allowlisted emails
  const cols = db
    .prepare("PRAGMA table_info(users)")
    .all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "password_hash")) {
    db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  }
  return db;
}

export function ensureAllowlistSeeded(adminEmail: string) {
  const email = adminEmail.toLowerCase();
  const row = getDb()
    .prepare("SELECT email FROM allowlist WHERE email = ?")
    .get(email);
  if (!row) {
    getDb()
      .prepare(
        "INSERT INTO allowlist (email, added_by, created_at) VALUES (?, ?, ?)",
      )
      .run(email, "system", new Date().toISOString());
  }
  const user = getUserByEmail(email);
  if (!user) {
    upsertUserFromGoogle({
      email,
      name: "Admin",
      image: null,
      forceAdmin: true,
    });
  } else if (user.role !== "admin") {
    getDb()
      .prepare("UPDATE users SET role = 'admin' WHERE email = ?")
      .run(email);
  }
  const adminPassword = process.env.AUTH_ADMIN_PASSWORD?.trim();
  if (adminPassword) {
    setUserPassword(email, adminPassword);
  }
}

export function setUserPassword(email: string, password: string) {
  const normalized = email.toLowerCase();
  if (!getUserByEmail(normalized)) {
    upsertUserFromGoogle({
      email: normalized,
      name: normalized.split("@")[0] || normalized,
      image: null,
      forceAdmin: normalized === "ayubshaik642@gmail.com",
    });
  }
  getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE email = ?")
    .run(hashPassword(password), normalized);
}

export function verifyUserPassword(email: string, password: string): boolean {
  const row = getDb()
    .prepare("SELECT password_hash FROM users WHERE email = ?")
    .get(email.toLowerCase()) as { password_hash?: string | null } | undefined;
  const stored = row?.password_hash;
  if (!stored) return false;
  return verifyPassword(password, stored);
}

export function isEmailAllowed(email: string): boolean {
  const row = getDb()
    .prepare("SELECT email FROM allowlist WHERE email = ?")
    .get(email.toLowerCase());
  return Boolean(row);
}

export function listAllowlist(): AllowlistRow[] {
  return (
    getDb()
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
  getDb()
    .prepare(
      `INSERT INTO allowlist (email, added_by, created_at) VALUES (?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    )
    .run(normalized, addedBy, new Date().toISOString());
  return listAllowlist();
}

export function removeAllowlistEmail(email: string) {
  getDb()
    .prepare("DELETE FROM allowlist WHERE email = ?")
    .run(email.toLowerCase());
  return listAllowlist();
}

export function getUserByEmail(email: string): AppUser | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    image: row.image ? String(row.image) : null,
    role: String(row.role) as "admin" | "user",
    createdAt: String(row.created_at),
  };
}

export function getUserById(id: string): AppUser | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    image: row.image ? String(row.image) : null,
    role: String(row.role) as "admin" | "user",
    createdAt: String(row.created_at),
  };
}

export function upsertUserFromGoogle(input: {
  email: string;
  name: string;
  image: string | null;
  forceAdmin?: boolean;
}): AppUser {
  const email = input.email.toLowerCase();
  const existing = getUserByEmail(email);
  const role =
    input.forceAdmin || email === "ayubshaik642@gmail.com"
      ? "admin"
      : existing?.role || "user";
  if (existing) {
    getDb()
      .prepare(
        "UPDATE users SET name = ?, image = ?, role = ? WHERE email = ?",
      )
      .run(input.name, input.image, role, email);
    return getUserByEmail(email)!;
  }
  const id = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO users (id, email, name, image, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      id,
      email,
      input.name,
      input.image,
      role,
      new Date().toISOString(),
    );
  return getUserByEmail(email)!;
}

export function deleteUserById(userId: string, email: string) {
  const database = getDb();
  const tx = database.transaction(() => {
    database.prepare("DELETE FROM users WHERE id = ?").run(userId);
    database.prepare("DELETE FROM allowlist WHERE email = ?").run(email.toLowerCase());
  });
  tx();
}
