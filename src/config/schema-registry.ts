export type FieldType = "text" | "number" | "date" | "boolean";
export type ConditionOp = "equals" | "notEquals" | "gte" | "lte" | "contains";
export type TargetTable = "conversations" | "messages";
export type JoinTable = "messages" | "tags";

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 50;

const TEXT_OPS: ConditionOp[] = ["equals", "notEquals", "contains"];
const COMPARABLE_OPS: ConditionOp[] = ["equals", "notEquals", "gte", "lte"];

export interface FieldDef {
  column: string;
  type: FieldType;
  ops: ConditionOp[];
}

export const ALLOWED_TARGETS: TargetTable[] = ["conversations", "messages"];
export const ALLOWED_JOIN_TABLES: JoinTable[] = ["messages", "tags"];

export const TABLE_FIELDS: Record<string, Record<string, FieldDef>> = {
  conversations: {
    id: { column: "conversations.id", type: "number", ops: COMPARABLE_OPS },
    title: { column: "conversations.title", type: "text", ops: TEXT_OPS },
    status: { column: "conversations.status", type: "text", ops: TEXT_OPS },
    created_at: {
      column: "conversations.created_at",
      type: "date",
      ops: COMPARABLE_OPS,
    },
  },
  messages: {
    id: { column: "messages.id", type: "number", ops: COMPARABLE_OPS },
    conversation_id: {
      column: "messages.conversation_id",
      type: "number",
      ops: COMPARABLE_OPS,
    },
    role: { column: "messages.role", type: "text", ops: TEXT_OPS },
    content: { column: "messages.content", type: "text", ops: TEXT_OPS },
    created_at: {
      column: "messages.created_at",
      type: "date",
      ops: COMPARABLE_OPS,
    },
  },
  tags: {
    id: { column: "tags.id", type: "number", ops: COMPARABLE_OPS },
    name: { column: "tags.name", type: "text", ops: TEXT_OPS },
  },
};

export const SELECTABLE_BY_TARGET: Record<TargetTable, string[]> = {
  conversations: ["id", "title", "status", "created_at"],
  messages: ["id", "conversation_id", "role", "content", "created_at"],
};

export const JOIN_SELECTABLE: Record<JoinTable, string[]> = {
  messages: ["id", "conversation_id", "role", "content", "created_at"],
  tags: ["id", "name"],
};

export function resolveField(
  target: TargetTable,
  field: string,
  joinedTables: Set<string>
): { table: string; def: FieldDef } | null {
  const normalized = field.includes(".") ? field : null;

  if (normalized) {
    const [table, col] = normalized.split(".", 2);
    const defs = TABLE_FIELDS[table];
    if (!defs?.[col]) return null;
    if (table !== target && !joinedTables.has(table) && table !== "tags") {
      if (table === "messages" && !joinedTables.has("messages")) return null;
      if (table === "tags" && !joinedTables.has("tags")) return null;
    }
    return { table, def: defs[col] };
  }

  if (TABLE_FIELDS[target]?.[field]) {
    return { table: target, def: TABLE_FIELDS[target][field] };
  }

  for (const joined of joinedTables) {
    const defs = TABLE_FIELDS[joined];
    if (defs?.[field]) {
      return { table: joined, def: defs[field] };
    }
  }

  return null;
}

export function qualifySelectField(
  target: TargetTable,
  field: string,
  joinedTables: Set<string>
): string | null {
  if (field.includes(".")) {
    const [table, col] = field.split(".", 2);
    const defs = TABLE_FIELDS[table];
    if (!defs?.[col]) return null;
    return defs[col].column;
  }

  if (SELECTABLE_BY_TARGET[target].includes(field)) {
    return TABLE_FIELDS[target][field].column;
  }

  for (const joined of joinedTables) {
    if (JOIN_SELECTABLE[joined as JoinTable]?.includes(field)) {
      return TABLE_FIELDS[joined][field].column;
    }
  }

  return null;
}

export function inferTablesFromField(field: string): string[] {
  if (field.includes(".")) {
    return [field.split(".", 2)[0]];
  }
  return [];
}