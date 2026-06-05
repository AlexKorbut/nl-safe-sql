import type { Condition } from "../intent/schema.js";
import {
  resolveField,
  type TargetTable,
} from "../config/schema-registry.js";
import { isDateFieldType, resolveDateValue } from "./date-resolver.js";

export interface WhereClause {
  sql: string;
  params: (string | number | boolean)[];
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

const OP_SQL: Record<string, string> = {
  equals: "=",
  notEquals: "!=",
  gte: ">=",
  lte: "<=",
};

export function buildWhereClause(
  target: TargetTable,
  conditions: Condition[],
  joinedTables: Set<string>
): WhereClause {
  const parts: string[] = [];
  const params: (string | number | boolean)[] = [];

  for (const cond of conditions) {
    const resolved = resolveField(target, cond.field, joinedTables);
    if (!resolved) {
      throw new Error(`Unresolved field: ${cond.field}`);
    }

    const column = resolved.def.column;
    let value: string | number | boolean = cond.value;

    if (isDateFieldType(resolved.def.type) && typeof value === "string") {
      value = resolveDateValue(value) as string;
    }

    if (cond.op === "contains") {
      if (typeof value !== "string") {
        throw new Error("contains requires string value");
      }
      parts.push(`${column} LIKE ? ESCAPE '\\'`);
      params.push(`%${escapeLike(value)}%`);
      continue;
    }

    const sqlOp = OP_SQL[cond.op];
    if (!sqlOp) {
      throw new Error(`Unsupported operator: ${cond.op}`);
    }

    parts.push(`${column} ${sqlOp} ?`);
    params.push(value);
  }

  return {
    sql: parts.length > 0 ? parts.join(" AND ") : "",
    params,
  };
}