import type { BuiltQuery } from "../sql/query-builder.js";
import type { QueryResult } from "../db/executor.js";
import type { QueryIntent } from "../intent/schema.js";

export interface FormattedResponse {
  rows: Record<string, unknown>[];
  meta: {
    rowCount: number;
    executionMs: number;
    rawIntent: unknown;
    intent: QueryIntent;
    sqlPreview?: string;
    paramsPreview?: (string | number | boolean)[];
  };
}

export function formatResponse(
  intent: QueryIntent,
  built: BuiltQuery,
  result: QueryResult,
  options?: { showSqlPreview?: boolean; rawIntent?: unknown }
): FormattedResponse {
  return {
    rows: result.rows,
    meta: {
      rowCount: result.rows.length,
      executionMs: result.executionMs,
      rawIntent: options?.rawIntent ?? intent,
      intent,
      ...(options?.showSqlPreview
        ? {
            sqlPreview: built.sql,
            paramsPreview: built.params,
          }
        : {}),
    },
  };
}