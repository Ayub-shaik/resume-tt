// Consistent snapshot of a SQLite file (encrypted or plain) via VACUUM INTO.
// usage: node snapshot.mjs <env-file> <src-db> <dest-db>   (env file is parsed, never printed)
import fs from "node:fs";
import { createRequire } from "node:module";
import { scryptSync } from "node:crypto";
const [envFile, src, dest] = process.argv.slice(2);
const require = createRequire(process.cwd() + "/");
const Database = require("better-sqlite3-multiple-ciphers");
const env = {};
for (const l of fs.readFileSync(envFile, "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
function keyFor(raw) {
  return /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : scryptSync(raw, "tomorrowtools-sqlite-v1", 32);
}
const head = Buffer.alloc(15);
const fd = fs.openSync(src, "r"); fs.readSync(fd, head, 0, 15, 0); fs.closeSync(fd);
const plain = head.toString("utf8") === "SQLite format 3";
const db = new Database(src, { fileMustExist: true });
if (!plain) { db.key(keyFor(env.DATA_AT_REST_KEY || env.SQLITE_ENCRYPTION_KEY)); }
db.pragma("busy_timeout = 10000");
db.prepare("SELECT count(*) FROM sqlite_master").get();
fs.rmSync(dest, { force: true });
db.prepare("VACUUM INTO ?").run(dest);
db.close();
console.log(`snapshot ok (${plain ? "plain" : "encrypted"}) ${fs.statSync(dest).size} bytes`);
