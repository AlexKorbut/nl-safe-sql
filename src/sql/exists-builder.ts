import type { Condition, RelatedFilter } from "../intent/schema.js";
import type { TargetTable } from "../config/schema-registry.js";
import { buildSingleCondition } from "./condition-builder.js";

export interface ExistsClause {
  sql: string;
  params: (string | number | boolean)[];
}

function conversationLink(
  target: TargetTable,
  relation: "messages" | "tags"
): string {
  if (target === "conversations") {
    return `${relation}.conversation_id = conversations.id`;
  }
  return `${relation}.conversation_id = messages.conversation_id`;
}

export function buildExistsForConditions(
  target: TargetTable,
  relation: "messages" | "tags",
  conditions: Condition[],
  existence: "exists" | "not_exists"
): ExistsClause {
  const parts: string[] = [];
  const params: (string | number | boolean)[] = [];

  for (const cond of conditions) {
    const built = buildSingleCondition(target, cond, new Set(), relation);
    parts.push(built.sql);
    params.push(...built.params);
  }

  const keyword = existence === "exists" ? "EXISTS" : "NOT EXISTS";
  const link = conversationLink(target, relation);
  const whereBody =
    parts.length > 0 ? `WHERE ${link} AND ${parts.join(" AND ")}` : `WHERE ${link}`;

  return {
    sql: `${keyword} (SELECT 1 FROM ${relation} ${whereBody})`,
    params,
  };
}

export function buildRelatedFilters(
  target: TargetTable,
  filters: RelatedFilter[]
): ExistsClause {
  const parts: string[] = [];
  const params: (string | number | boolean)[] = [];

  for (const filter of filters) {
    const built = buildExistsForConditions(
      target,
      filter.relation,
      filter.conditions,
      filter.existence
    );
    parts.push(built.sql);
    params.push(...built.params);
  }

  return {
    sql: parts.join(" AND "),
    params,
  };
}