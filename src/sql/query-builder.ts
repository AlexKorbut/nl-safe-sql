import type { QueryIntent } from "../intent/schema.js";
import type { ValidatedIntent } from "../validation/intent-validator.js";
import {
  qualifySelectField,
  resolveField,
  type TargetTable,
} from "../config/schema-registry.js";
import { buildWhereClause } from "./condition-builder.js";
import { buildJoins } from "./join-manager.js";

export interface BuiltQuery {
  sql: string;
  params: (string | number | boolean)[];
}

export function buildQuery(validated: ValidatedIntent): BuiltQuery {
  const { intent, limit, joinedTables } = validated;
  const target = intent.target as TargetTable;

  const selectCols = intent.select.map((field) => {
    const col = qualifySelectField(target, field, joinedTables);
    if (!col) throw new Error(`Forbidden select field: ${field}`);
    return col;
  });

  const joins = buildJoins(target, joinedTables);
  const fromTable = target;

  let sql = `SELECT ${selectCols.join(", ")}\nFROM ${fromTable}`;
  if (joins.sql) {
    sql += `\n${joins.sql}`;
  }

  const params: (string | number | boolean)[] = [];

  if (intent.conditions && intent.conditions.length > 0) {
    const where = buildWhereClause(target, intent.conditions, joinedTables);
    if (where.sql) {
      sql += `\nWHERE ${where.sql}`;
      params.push(...where.params);
    }
  }

  if (intent.orderBy && intent.orderBy.length > 0) {
    const orderParts = intent.orderBy.map((ob) => {
      const resolved = resolveField(target, ob.field, joinedTables);
      if (!resolved) throw new Error(`Forbidden order field: ${ob.field}`);
      return `${resolved.def.column} ${ob.direction.toUpperCase()}`;
    });
    sql += `\nORDER BY ${orderParts.join(", ")}`;
  }

  sql += `\nLIMIT ?`;
  params.push(limit);

  return { sql, params };
}