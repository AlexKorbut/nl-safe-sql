import type {
  AggregateSelect,
  Condition,
  HavingCondition,
} from "../intent/schema.js";
import {
  qualifySelectField,
  resolveField,
  type TargetTable,
} from "../config/schema-registry.js";
import { buildSingleCondition } from "./condition-builder.js";

const HAVING_OP_SQL: Record<string, string> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  equals: "=",
  notEquals: "!=",
};

function countFieldSql(field: string, target: TargetTable): string {
  if (field === "*") return "*";
  if (field.includes(".")) return field;
  if (target === "conversations" && field === "id") {
    return "conversations.id";
  }
  if (target === "messages" && field === "id") {
    return "messages.id";
  }
  return field;
}

function buildFilteredCountExpr(
  agg: AggregateSelect | HavingCondition,
  target: TargetTable,
  joinedTables: Set<string>
): { sql: string; params: (string | number | boolean)[] } {
  const params: (string | number | boolean)[] = [];

  if (!agg.filter || agg.filter.length === 0) {
    const fieldSql = countFieldSql(agg.field, target);
    if (agg.fn === "count" && fieldSql === "*") {
      return { sql: "COUNT(*)", params };
    }
    return { sql: `COUNT(${fieldSql})`, params };
  }

  const filterParts: string[] = [];
  for (const cond of agg.filter) {
    const built = buildSingleCondition(target, cond, joinedTables);
    filterParts.push(built.sql);
    params.push(...built.params);
  }

  const fieldSql = countFieldSql(agg.field, target);
  const filterExpr = filterParts.join(" AND ");
  const caseExpr =
    fieldSql === "*"
      ? `CASE WHEN ${filterExpr} THEN 1 END`
      : `CASE WHEN ${filterExpr} THEN ${fieldSql} END`;

  return { sql: `COUNT(${caseExpr})`, params };
}

export function buildAggregateSelect(
  agg: AggregateSelect,
  target: TargetTable,
  joinedTables: Set<string>
): { sql: string; params: (string | number | boolean)[] } {
  const built = buildFilteredCountExpr(agg, target, joinedTables);
  return {
    sql: `${built.sql} AS ${agg.alias}`,
    params: built.params,
  };
}

export function buildHavingClause(
  conditions: HavingCondition[],
  target: TargetTable,
  joinedTables: Set<string>
): { sql: string; params: (string | number | boolean)[] } {
  const parts: string[] = [];
  const params: (string | number | boolean)[] = [];

  for (const cond of conditions) {
    const expr = buildFilteredCountExpr(cond, target, joinedTables);
    const op = HAVING_OP_SQL[cond.op];
    if (!op) throw new Error(`Unsupported having operator: ${cond.op}`);
    parts.push(`${expr.sql} ${op} ?`);
    params.push(...expr.params, cond.value);
  }

  return { sql: parts.join(" AND "), params };
}

export function buildGroupByClause(
  target: TargetTable,
  fields: string[],
  joinedTables: Set<string>,
  aggregateAliases: Set<string>
): string {
  const cols = fields.map((field) => {
    if (aggregateAliases.has(field)) {
      return field;
    }
    const col = qualifySelectField(target, field, joinedTables);
    if (!col) {
      const resolved = resolveField(target, field, joinedTables);
      if (!resolved) throw new Error(`Forbidden group field: ${field}`);
      return resolved.def.column;
    }
    return col;
  });
  return cols.join(", ");
}