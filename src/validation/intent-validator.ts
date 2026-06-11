import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  ALLOWED_JOIN_TABLES,
  ALLOWED_TARGETS,
  JOIN_SELECTABLE,
  SELECTABLE_BY_TARGET,
  resolveField,
  qualifySelectField,
  tableForField,
  type TargetTable,
  type JoinTable,
} from "../config/schema-registry.js";
import {
  queryIntentSchema,
  isAggregateSelect,
  type QueryIntent,
} from "../intent/schema.js";

export type ValidationErrorCode =
  | "INVALID_SCHEMA"
  | "FORBIDDEN_TABLE"
  | "FORBIDDEN_FIELD"
  | "FORBIDDEN_OP"
  | "INVALID_LIMIT"
  | "INVALID_AGGREGATE";

export class IntentValidationError extends Error {
  constructor(
    public readonly code: ValidationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "IntentValidationError";
  }
}

export interface ValidatedIntent {
  intent: QueryIntent;
  limit: number;
  joinedTables: Set<string>;
}

function collectJoinedTables(intent: QueryIntent): Set<string> {
  const joined = new Set<string>(intent.requiredTables ?? []);

  const inspectField = (field: string): void => {
    if (field.includes(".")) {
      joined.add(field.split(".", 2)[0]);
    }
  };

  for (const cond of intent.conditions ?? []) inspectField(cond.field);
  for (const ob of intent.orderBy ?? []) inspectField(ob.field);
  for (const item of intent.select) {
    if (typeof item === "string") inspectField(item);
    else {
      inspectField(item.field);
      for (const f of item.filter ?? []) inspectField(f.field);
    }
  }
  for (const field of intent.groupBy ?? []) inspectField(field);
  for (const rf of intent.relatedFilters ?? []) {
    joined.add(rf.relation);
    for (const cond of rf.conditions) inspectField(cond.field);
  }
  for (const h of intent.having ?? []) {
    inspectField(h.field);
    for (const f of h.filter ?? []) inspectField(f.field);
  }

  joined.delete(intent.target);
  return joined;
}

function inferRequiredJoins(
  target: TargetTable,
  intent: QueryIntent,
  joined: Set<string>
): void {
  for (const cond of intent.conditions ?? []) {
    const table = tableForField(target, cond.field, joined);
    if (table && table !== target && (table === "messages" || table === "tags")) {
      joined.add(table);
    }
    if (
      !cond.field.includes(".") &&
      target === "conversations" &&
      ["body", "direction", "sent_at", "conversation_id"].includes(cond.field)
    ) {
      joined.add("messages");
    }
    if (
      !cond.field.includes(".") &&
      target === "conversations" &&
      ["label"].includes(cond.field)
    ) {
      joined.add("tags");
    }
  }

  for (const item of intent.select) {
    if (typeof item === "string") {
      if (item.startsWith("messages.") || ["body", "direction", "sent_at"].includes(item)) {
        if (target === "conversations") joined.add("messages");
      }
      if (item.startsWith("tags.") || item === "label") {
        joined.add("tags");
      }
    } else {
      if (item.field.includes("messages")) joined.add("messages");
      if (item.field.includes("tags")) joined.add("tags");
      for (const f of item.filter ?? []) {
        const table = tableForField(target, f.field, joined);
        if (table === "messages" || table === "tags") joined.add(table);
      }
    }
  }

  for (const rf of intent.relatedFilters ?? []) {
    joined.add(rf.relation);
  }
}

function validateConditions(
  target: TargetTable,
  conditions: QueryIntent["conditions"],
  joined: Set<string>,
  contextTable?: string
): void {
  for (const cond of conditions ?? []) {
    const resolved = resolveField(
      target,
      cond.field,
      joined,
      contextTable
    );
    if (!resolved) {
      throw new IntentValidationError(
        "FORBIDDEN_FIELD",
        `Condition field not allowed: ${cond.field}`
      );
    }
    if (!resolved.def.ops.includes(cond.op)) {
      throw new IntentValidationError(
        "FORBIDDEN_OP",
        `Operator ${cond.op} not allowed for field ${cond.field}`
      );
    }
  }
}

function normalizeIntent(intent: QueryIntent): QueryIntent {
  if (!intent.having || intent.having.length === 0) {
    return intent;
  }

  const normalized: QueryIntent = {
    ...intent,
    type: "aggregate",
    select: [...intent.select],
    groupBy: intent.groupBy ? [...intent.groupBy] : undefined,
  };

  const plainSelect = normalized.select.filter(
    (item): item is string => typeof item === "string"
  );
  const hasAggregate = normalized.select.some(isAggregateSelect);

  if (!hasAggregate) {
    for (const h of intent.having) {
      normalized.select.push({
        fn: h.fn,
        field: h.field,
        alias: h.alias,
        filter: h.filter,
      });
    }
  }

  if (!normalized.groupBy || normalized.groupBy.length === 0) {
    normalized.groupBy = plainSelect;
  }

  return normalized;
}

export function validateIntent(raw: unknown): ValidatedIntent {
  const parsed = queryIntentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new IntentValidationError(
      "INVALID_SCHEMA",
      parsed.error.message
    );
  }

  const intent = normalizeIntent(parsed.data);
  const target = intent.target as TargetTable;

  if (!ALLOWED_TARGETS.includes(target)) {
    throw new IntentValidationError("FORBIDDEN_TABLE", `Unknown target: ${target}`);
  }

  const hasAggregate = intent.select.some(isAggregateSelect);
  if (intent.type === "aggregate" && !hasAggregate) {
    throw new IntentValidationError(
      "INVALID_AGGREGATE",
      "aggregate type requires at least one aggregate select"
    );
  }
  if (hasAggregate) {
    const plainFields = intent.select.filter((item) => typeof item === "string");
    if (plainFields.length > 0 && (!intent.groupBy || intent.groupBy.length === 0)) {
      throw new IntentValidationError(
        "INVALID_AGGREGATE",
        "mixed aggregate and plain select requires groupBy"
      );
    }
  }

  for (const table of intent.requiredTables ?? []) {
    if (!ALLOWED_JOIN_TABLES.includes(table as JoinTable)) {
      throw new IntentValidationError(
        "FORBIDDEN_TABLE",
        `Join table not allowed: ${table}`
      );
    }
  }

  const joined = collectJoinedTables(intent);
  inferRequiredJoins(target, intent, joined);

  for (const table of joined) {
    if (table !== "messages" && table !== "tags" && table !== "conversations") {
      throw new IntentValidationError(
        "FORBIDDEN_TABLE",
        `Join table not allowed: ${table}`
      );
    }
    if (target === "messages" && table === "messages") {
      throw new IntentValidationError(
        "FORBIDDEN_TABLE",
        "Cannot join messages when target is messages"
      );
    }
  }

  if (target === "messages" && joined.has("tags")) {
    joined.add("conversations");
  }

  for (const item of intent.select) {
    if (isAggregateSelect(item)) {
      if (!["count", "sum"].includes(item.fn)) {
        throw new IntentValidationError(
          "INVALID_AGGREGATE",
          `Unsupported aggregate fn: ${item.fn}`
        );
      }
      validateConditions(target, item.filter, joined);
      continue;
    }

    const qualified = qualifySelectField(target, item, joined);
    if (!qualified) {
      throw new IntentValidationError(
        "FORBIDDEN_FIELD",
        `Select field not allowed: ${item}`
      );
    }
    const allowed =
      SELECTABLE_BY_TARGET[target].includes(item) ||
      item.includes(".") ||
      [...joined].some((t) =>
        JOIN_SELECTABLE[t as JoinTable]?.includes(item)
      );
    if (!allowed && !item.includes(".")) {
      throw new IntentValidationError(
        "FORBIDDEN_FIELD",
        `Select field not allowed: ${item}`
      );
    }
  }

  validateConditions(target, intent.conditions, joined);

  for (const rf of intent.relatedFilters ?? []) {
    validateConditions(target, rf.conditions, joined, rf.relation);
  }

  for (const ob of intent.orderBy ?? []) {
    const isAlias = intent.select.some(
      (item) => isAggregateSelect(item) && item.alias === ob.field
    );
    if (!isAlias) {
      const resolved = resolveField(target, ob.field, joined);
      if (!resolved) {
        throw new IntentValidationError(
          "FORBIDDEN_FIELD",
          `Order field not allowed: ${ob.field}`
        );
      }
    }
  }

  for (const field of intent.groupBy ?? []) {
    const isAlias = intent.select.some(
      (item) => isAggregateSelect(item) && item.alias === field
    );
    if (!isAlias) {
      const resolved = resolveField(target, field, joined);
      if (!resolved) {
        throw new IntentValidationError(
          "FORBIDDEN_FIELD",
          `Group field not allowed: ${field}`
        );
      }
    }
  }

  for (const h of intent.having ?? []) {
    validateConditions(target, h.filter, joined);
  }

  let limit = intent.limit ?? DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) {
    throw new IntentValidationError(
      "INVALID_LIMIT",
      `Limit exceeds maximum of ${MAX_LIMIT}`
    );
  }

  return { intent, limit, joinedTables: joined };
}