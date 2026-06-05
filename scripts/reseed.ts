/**
 * Wipes and reloads mock data. Safe to run anytime while developing.
 *
 * Usage: npm run db:reseed
 */
import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { runMigrations } from "../src/db/migrate.js";

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/app.db";
const projectRoot = path.resolve(import.meta.dirname, "..");
const seedPath = path.join(projectRoot, "scripts", "seed.sql");

function clearData(db: Database.Database): void {
  db.exec(`
    DELETE FROM conversation_tags;
    DELETE FROM messages;
    DELETE FROM conversations;
    DELETE FROM tags;
    DELETE FROM sqlite_sequence WHERE name IN (
      'conversations', 'messages', 'tags'
    );
  `);
}

function main(): void {
  const dir = path.dirname(DATABASE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DATABASE_PATH);
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  clearData(db);

  const seedSql = fs.readFileSync(seedPath, "utf-8");
  db.exec(seedSql);

  const stats = {
    conversations: (
      db.prepare("SELECT COUNT(*) AS c FROM conversations").get() as { c: number }
    ).c,
    messages: (
      db.prepare("SELECT COUNT(*) AS c FROM messages").get() as { c: number }
    ).c,
    tags: (db.prepare("SELECT COUNT(*) AS c FROM tags").get() as { c: number })
      .c,
    links: (
      db
        .prepare("SELECT COUNT(*) AS c FROM conversation_tags")
        .get() as { c: number }
    ).c,
  };

  db.close();

  console.log(`Database reseeded: ${DATABASE_PATH}`);
  console.log(JSON.stringify(stats, null, 2));
}

main();