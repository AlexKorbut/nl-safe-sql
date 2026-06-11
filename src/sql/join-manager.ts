import type { TargetTable, JoinTable } from "../config/schema-registry.js";

export interface JoinClause {
  sql: string;
}

const JOIN_RECIPES: Record<
  TargetTable,
  Record<JoinTable | "conversations", string>
> = {
  conversations: {
    messages:
      "LEFT JOIN messages ON messages.conversation_id = conversations.id",
    tags: "LEFT JOIN tags ON tags.conversation_id = conversations.id",
    conversations: "",
  },
  messages: {
    messages: "",
    conversations:
      "INNER JOIN conversations ON conversations.id = messages.conversation_id",
    tags: "LEFT JOIN tags ON tags.conversation_id = messages.conversation_id",
  },
};

export function buildJoins(
  target: TargetTable,
  joinedTables: Set<string>
): JoinClause {
  const parts: string[] = [];

  if (target === "messages" && joinedTables.has("tags")) {
    joinedTables.add("conversations");
  }

  const order: (JoinTable | "conversations")[] =
    target === "messages"
      ? ["conversations", "tags", "messages"]
      : ["messages", "tags"];

  for (const table of order) {
    if (table === target) continue;
    if (table === "messages" && target === "messages") continue;
    if (!joinedTables.has(table) && table !== "conversations") continue;
    if (table === "conversations" && !joinedTables.has("tags")) continue;

    const recipe =
      JOIN_RECIPES[target][table as JoinTable | "conversations"];
    if (recipe) parts.push(recipe);
  }

  return { sql: parts.join("\n") };
}