import type Database from "better-sqlite3";

export interface QueryResult {
  rows: Record<string, unknown>[];
  executionMs: number;
}

export class DatabaseExecutor {
  constructor(private readonly db: Database.Database) {}

  execute(sql: string, params: (string | number | boolean)[]): QueryResult {
    const start = performance.now();
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return {
      rows,
      executionMs: Math.round(performance.now() - start),
    };
  }
}