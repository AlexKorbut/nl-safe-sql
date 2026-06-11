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

export function buildSingleCondition(
  target: TargetTable,
  cond: Condition,
  joinedTables: Set<string>,
  contextTable?: string
): { sql: string; params: (string | number | boolean)[] } {
  const resolved = resolveField(target, cond.field, joinedTables, contextTable);
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
    return {
      sql: `${column} LIKE ? ESCAPE '\\'`,
      params: [`%${escapeLike(value)}%`],
    };
  }

  if (cond.op === "starts_with") {
    if (typeof value !== "string") {
      throw new Error("starts_with requires string value");
    }
    return {
      sql: `${column} LIKE ? ESCAPE '\\'`,
      params: [`${escapeLike(value)}%`],
    };
  }

  if (cond.op === "ends_with") {
    if (typeof value !== "string") {
      throw new Error("ends_with requires string value");
    }
    return {
      sql: `${column} LIKE ? ESCAPE '\\'`,
      params: [`%${escapeLike(value)}`],
    };
  }

  const sqlOp = OP_SQL[cond.op];
  if (!sqlOp) {
    throw new Error(`Unsupported operator: ${cond.op}`);
  }

  return { sql: `${column} ${sqlOp} ?`, params: [value] };
}

export function buildWhereClause(
  target: TargetTable,
  conditions: Condition[],
  joinedTables: Set<string>,
  logic: "and" | "or" = "and"
): WhereClause {
  const parts: string[] = [];
  const params: (string | number | boolean)[] = [];

  for (const cond of conditions) {
    const built = buildSingleCondition(target, cond, joinedTables);
    parts.push(built.sql);
    params.push(...built.params);
  }

  const joiner = logic === "or" ? " OR " : " AND ";
  return {
    sql: parts.length > 0 ? parts.join(joiner) : "",
    params,
  };
}