import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

export function runMigrations(db: Database.Database): void {
  const migrationPath = path.join(projectRoot, "migrations", "001_init.sql");
  const sql = fs.readFileSync(migrationPath, "utf-8");
  db.exec(sql);
}

export function runSeed(db: Database.Database): void {
  const count = db
    .prepare("SELECT COUNT(*) as c FROM conversations")
    .get() as { c: number };
  if (count.c > 0) return;

  const seedPath = path.join(projectRoot, "scripts", "seed.sql");
  const sql = fs.readFileSync(seedPath, "utf-8");
  db.exec(sql);
}

export function initDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  runSeed(db);
  return db;
}