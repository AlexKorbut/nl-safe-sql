export type FieldType = "text" | "number" | "date" | "boolean";
export type ConditionOp =
  | "equals"
  | "notEquals"
  | "gte"
  | "lte"
  | "contains"
  | "starts_with"
  | "ends_with";
export type TargetTable = "conversations" | "messages";
export type JoinTable = "messages" | "tags";

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 50;

const TEXT_OPS: ConditionOp[] = [
  "equals",
  "notEquals",
  "contains",
  "starts_with",
  "ends_with",
];
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
    guest_name: {
      column: "conversations.guest_name",
      type: "text",
      ops: TEXT_OPS,
    },
    channel: { column: "conversations.channel", type: "text", ops: TEXT_OPS },
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
    direction: {
      column: "messages.direction",
      type: "text",
      ops: TEXT_OPS,
    },
    body: { column: "messages.body", type: "text", ops: TEXT_OPS },
    sent_at: {
      column: "messages.sent_at",
      type: "date",
      ops: COMPARABLE_OPS,
    },
  },
  tags: {
    id: { column: "tags.id", type: "number", ops: COMPARABLE_OPS },
    conversation_id: {
      column: "tags.conversation_id",
      type: "number",
      ops: COMPARABLE_OPS,
    },
    label: { column: "tags.label", type: "text", ops: TEXT_OPS },
  },
};

export const SELECTABLE_BY_TARGET: Record<TargetTable, string[]> = {
  conversations: ["id", "guest_name", "channel", "status", "created_at"],
  messages: ["id", "conversation_id", "direction", "body", "sent_at"],
};

export const JOIN_SELECTABLE: Record<JoinTable, string[]> = {
  messages: ["id", "conversation_id", "direction", "body", "sent_at"],
  tags: ["id", "conversation_id", "label"],
};

export function resolveField(
  target: TargetTable,
  field: string,
  joinedTables: Set<string>,
  contextTable?: string
): { table: string; def: FieldDef } | null {
  if (field.includes(".")) {
    const [table, col] = field.split(".", 2);
    const defs = TABLE_FIELDS[table];
    if (!defs?.[col]) return null;
    if (
      table !== target &&
      !joinedTables.has(table) &&
      table !== contextTable
    ) {
      return null;
    }
    return { table, def: defs[col] };
  }

  if (contextTable && TABLE_FIELDS[contextTable]?.[field]) {
    return { table: contextTable, def: TABLE_FIELDS[contextTable][field] };
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

export function tableForField(
  target: TargetTable,
  field: string,
  joinedTables: Set<string>
): string | null {
  const resolved = resolveField(target, field, joinedTables);
  return resolved?.table ?? null;
}