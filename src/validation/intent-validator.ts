import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  ALLOWED_JOIN_TABLES,
  ALLOWED_TARGETS,
  JOIN_SELECTABLE,
  SELECTABLE_BY_TARGET,
  resolveField,
  qualifySelectField,
  type TargetTable,
  type JoinTable,
} from "../config/schema-registry.js";
import { queryIntentSchema, type QueryIntent } from "../intent/schema.js";

export type ValidationErrorCode =
  | "INVALID_SCHEMA"
  | "FORBIDDEN_TABLE"
  | "FORBIDDEN_FIELD"
  | "FORBIDDEN_OP"
  | "INVALID_LIMIT";

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

  for (const cond of intent.conditions ?? []) {
    if (cond.field.includes(".")) {
      joined.add(cond.field.split(".", 2)[0]);
    }
  }

  for (const ob of intent.orderBy ?? []) {
    if (ob.field.includes(".")) {
      joined.add(ob.field.split(".", 2)[0]);
    }
  }

  for (const sel of intent.select) {
    if (sel.includes(".")) {
      joined.add(sel.split(".", 2)[0]);
    }
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
    const resolved = resolveField(target, cond.field, joined);
    if (resolved && resolved.table !== target) {
      if (resolved.table === "tags") joined.add("tags");
      if (resolved.table === "messages") joined.add("messages");
    }
    if (
      !cond.field.includes(".") &&
      target === "conversations" &&
      ["content", "role", "conversation_id"].includes(cond.field)
    ) {
      joined.add("messages");
    }
    if (
      !cond.field.includes(".") &&
      ["name"].includes(cond.field) &&
      target === "conversations"
    ) {
      joined.add("tags");
    }
  }

  for (const sel of intent.select) {
    if (sel.startsWith("messages.") || sel === "content" || sel === "role") {
      if (target === "conversations") joined.add("messages");
    }
    if (sel.startsWith("tags.") || sel === "name") {
      joined.add("tags");
    }
  }
}

export function validateIntent(raw: unknown): ValidatedIntent {
  const parsed = queryIntentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new IntentValidationError(
      "INVALID_SCHEMA",
      parsed.error.message
    );
  }

  const intent = parsed.data;
  const target = intent.target as TargetTable;

  if (!ALLOWED_TARGETS.includes(target)) {
    throw new IntentValidationError("FORBIDDEN_TABLE", `Unknown target: ${target}`);
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
    if (table !== "messages" && table !== "tags") {
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

  for (const field of intent.select) {
    const qualified = qualifySelectField(target, field, joined);
    if (!qualified) {
      throw new IntentValidationError(
        "FORBIDDEN_FIELD",
        `Select field not allowed: ${field}`
      );
    }
    const allowed =
      SELECTABLE_BY_TARGET[target].includes(field) ||
      field.includes(".") ||
      JOIN_SELECTABLE.messages.includes(field) ||
      JOIN_SELECTABLE.tags.includes(field);
    if (!allowed && !field.includes(".")) {
      const inJoin = [...joined].some((t) =>
        JOIN_SELECTABLE[t as JoinTable]?.includes(field)
      );
      if (!inJoin) {
        throw new IntentValidationError(
          "FORBIDDEN_FIELD",
          `Select field not allowed: ${field}`
        );
      }
    }
  }

  for (const cond of intent.conditions ?? []) {
    const resolved = resolveField(target, cond.field, joined);
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

  for (const ob of intent.orderBy ?? []) {
    const resolved = resolveField(target, ob.field, joined);
    if (!resolved) {
      throw new IntentValidationError(
        "FORBIDDEN_FIELD",
        `Order field not allowed: ${ob.field}`
      );
    }
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