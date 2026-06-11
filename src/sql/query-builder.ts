import type { Condition, QueryIntent } from "../intent/schema.js";
import { isAggregateSelect } from "../intent/schema.js";
import type { ValidatedIntent } from "../validation/intent-validator.js";
import {
  qualifySelectField,
  resolveField,
  tableForField,
  type TargetTable,
} from "../config/schema-registry.js";
import { buildWhereClause } from "./condition-builder.js";
import { buildJoins } from "./join-manager.js";
import {
  buildAggregateSelect,
  buildGroupByClause,
  buildHavingClause,
} from "./aggregate-builder.js";
import {
  buildExistsForConditions,
  buildRelatedFilters,
} from "./exists-builder.js";

export interface BuiltQuery {
  sql: string;
  params: (string | number | boolean)[];
}

function isJoinTable(table: string | null): table is "messages" | "tags" {
  return table === "messages" || table === "tags";
}

function inferConditionTable(
  target: TargetTable,
  field: string
): string | null {
  if (field.includes(".")) {
    return field.split(".", 2)[0];
  }
  if (target === "conversations") {
    if (["body", "direction", "sent_at", "conversation_id"].includes(field)) {
      return "messages";
    }
    if (field === "label") return "tags";
  }
  if (target === "messages") {
    if (["guest_name", "channel", "status", "created_at"].includes(field)) {
      return "conversations";
    }
    if (field === "label") return "tags";
  }
  return target;
}

function partitionConditions(
  target: TargetTable,
  conditions: Condition[]
): {
  targetConditions: Condition[];
  existsFilters: { relation: "messages" | "tags"; conditions: Condition[] }[];
} {
  const targetConditions: Condition[] = [];
  const existsByRelation = new Map<
    "messages" | "tags",
    Condition[]
  >();

  for (const cond of conditions) {
    const table = inferConditionTable(target, cond.field);
    if (isJoinTable(table) && table !== target) {
      const existing = existsByRelation.get(table) ?? [];
      existing.push(cond);
      existsByRelation.set(table, existing);
    } else {
      targetConditions.push(cond);
    }
  }

  return {
    targetConditions,
    existsFilters: [...existsByRelation.entries()].map(([relation, conds]) => ({
      relation,
      conditions: conds,
    })),
  };
}

function collectJoinTablesForSelect(
  target: TargetTable,
  intent: QueryIntent,
  joinedTables: Set<string>
): Set<string> {
  const needed = new Set<string>(joinedTables);

  for (const item of intent.select) {
    if (isAggregateSelect(item)) {
      if (item.field.includes("messages.")) needed.add("messages");
      if (item.field.includes("tags.")) needed.add("tags");
      for (const cond of item.filter ?? []) {
        const table = tableForField(target, cond.field, needed);
        if (isJoinTable(table)) needed.add(table);
      }
    } else if (item.includes(".")) {
      needed.add(item.split(".", 2)[0]);
    }
  }

  for (const field of intent.groupBy ?? []) {
    const table = tableForField(target, field, needed);
    if (isJoinTable(table)) needed.add(table);
  }

  for (const cond of intent.having ?? []) {
    if (cond.field.includes("messages.")) needed.add("messages");
    if (cond.field.includes("tags.")) needed.add("tags");
    for (const f of cond.filter ?? []) {
      const table = tableForField(target, f.field, needed);
      if (isJoinTable(table)) needed.add(table);
    }
  }

  return needed;
}

export function buildQuery(validated: ValidatedIntent): BuiltQuery {
  const { intent, limit, joinedTables } = validated;
  const target = intent.target as TargetTable;
  const params: (string | number | boolean)[] = [];
  const whereParts: string[] = [];

  const selectJoinTables = collectJoinTablesForSelect(target, intent, new Set());
  const aggregateAliases = new Set(
    intent.select
      .filter(isAggregateSelect)
      .map((item) => item.alias)
  );

  const selectCols: string[] = [];
  for (const item of intent.select) {
    if (isAggregateSelect(item)) {
      const built = buildAggregateSelect(item, target, selectJoinTables);
      selectCols.push(built.sql);
      params.push(...built.params);
    } else {
      const col = qualifySelectField(target, item, selectJoinTables);
      if (!col) throw new Error(`Forbidden select field: ${item}`);
      selectCols.push(col);
    }
  }

  const joins = buildJoins(target, selectJoinTables);
  let sql = `SELECT ${selectCols.join(", ")}\nFROM ${target}`;
  if (joins.sql) {
    sql += `\n${joins.sql}`;
  }

  const allConditions = intent.conditions ?? [];
  const { targetConditions, existsFilters } = partitionConditions(
    target,
    allConditions
  );

  if (targetConditions.length > 0) {
    const where = buildWhereClause(
      target,
      targetConditions,
      selectJoinTables,
      intent.conditionLogic ?? "and"
    );
    if (where.sql) {
      if (intent.conditionLogic === "or" && targetConditions.length > 1) {
        whereParts.push(`(${where.sql})`);
      } else {
        whereParts.push(where.sql);
      }
      params.push(...where.params);
    }
  }

  for (const filter of existsFilters) {
    const built = buildExistsForConditions(
      target,
      filter.relation,
      filter.conditions,
      "exists"
    );
    whereParts.push(built.sql);
    params.push(...built.params);
  }

  if (intent.relatedFilters && intent.relatedFilters.length > 0) {
    const built = buildRelatedFilters(target, intent.relatedFilters);
    if (built.sql) {
      whereParts.push(built.sql);
      params.push(...built.params);
    }
  }

  if (whereParts.length > 0) {
    sql += `\nWHERE ${whereParts.join(" AND ")}`;
  }

  if (intent.groupBy && intent.groupBy.length > 0) {
    sql += `\nGROUP BY ${buildGroupByClause(
      target,
      intent.groupBy,
      selectJoinTables,
      aggregateAliases
    )}`;
  }

  if (intent.having && intent.having.length > 0) {
    const having = buildHavingClause(
      intent.having,
      target,
      selectJoinTables
    );
    sql += `\nHAVING ${having.sql}`;
    params.push(...having.params);
  }

  if (intent.orderBy && intent.orderBy.length > 0) {
    const orderParts = intent.orderBy.map((ob) => {
      if (aggregateAliases.has(ob.field)) {
        return `${ob.field} ${ob.direction.toUpperCase()}`;
      }
      const resolved = resolveField(target, ob.field, selectJoinTables);
      if (!resolved) throw new Error(`Forbidden order field: ${ob.field}`);
      return `${resolved.def.column} ${ob.direction.toUpperCase()}`;
    });
    sql += `\nORDER BY ${orderParts.join(", ")}`;
  }

  sql += `\nLIMIT ?`;
  params.push(limit);

  return { sql, params };
}