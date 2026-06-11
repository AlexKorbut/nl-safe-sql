import { z } from "zod";

export const conditionOpSchema = z.enum([
  "equals",
  "notEquals",
  "gte",
  "lte",
  "contains",
  "starts_with",
  "ends_with",
]);

export const conditionSchema = z.object({
  field: z.string().min(1),
  op: conditionOpSchema,
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const orderBySchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

export const aggregateFnSchema = z.enum(["count", "sum"]);

export const aggregateSelectSchema = z.object({
  fn: aggregateFnSchema,
  field: z.string().min(1),
  alias: z.string().min(1),
  filter: z.array(conditionSchema).optional(),
});

export const selectItemSchema = z.union([
  z.string().min(1),
  aggregateSelectSchema,
]);

export const relatedFilterSchema = z.object({
  relation: z.enum(["messages", "tags"]),
  existence: z.enum(["exists", "not_exists"]),
  conditions: z.array(conditionSchema).default([]),
});

export const havingOpSchema = z.enum([
  "gt",
  "gte",
  "lt",
  "lte",
  "equals",
  "notEquals",
]);

export const havingConditionSchema = z.object({
  fn: aggregateFnSchema,
  field: z.string().min(1),
  alias: z.string().min(1),
  op: havingOpSchema,
  value: z.number(),
  filter: z.array(conditionSchema).optional(),
});

export const queryIntentSchema = z.object({
  type: z.enum(["select", "aggregate"]),
  target: z.enum(["conversations", "messages"]),
  select: z.array(selectItemSchema).min(1),
  conditions: z.array(conditionSchema).optional(),
  conditionLogic: z.enum(["and", "or"]).default("and"),
  relatedFilters: z.array(relatedFilterSchema).optional(),
  requiredTables: z.array(z.enum(["messages", "tags"])).optional(),
  groupBy: z.array(z.string().min(1)).optional(),
  having: z.array(havingConditionSchema).optional(),
  orderBy: z.array(orderBySchema).optional(),
  limit: z.number().int().positive().optional(),
});

export type QueryIntent = z.infer<typeof queryIntentSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type OrderBy = z.infer<typeof orderBySchema>;
export type AggregateSelect = z.infer<typeof aggregateSelectSchema>;
export type SelectItem = z.infer<typeof selectItemSchema>;
export type RelatedFilter = z.infer<typeof relatedFilterSchema>;
export type HavingCondition = z.infer<typeof havingConditionSchema>;

export function isAggregateSelect(item: SelectItem): item is AggregateSelect {
  return typeof item === "object" && item !== null && "fn" in item;
}