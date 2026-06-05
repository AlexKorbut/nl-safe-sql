import Database from "better-sqlite3";
import { runMigrations, runSeed } from "../../src/db/migrate.js";
import { DatabaseExecutor } from "../../src/db/executor.js";

export function createTestDb(): { db: Database.Database; executor: DatabaseExecutor } {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  runSeed(db);
  return { db, executor: new DatabaseExecutor(db) };
}