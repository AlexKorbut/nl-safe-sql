import { z } from "zod";

export const conditionOpSchema = z.enum([
  "equals",
  "notEquals",
  "gte",
  "lte",
  "contains",
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

export const queryIntentSchema = z.object({
  type: z.literal("select"),
  target: z.enum(["conversations", "messages"]),
  select: z.array(z.string().min(1)).min(1),
  conditions: z.array(conditionSchema).optional(),
  requiredTables: z.array(z.enum(["messages", "tags"])).optional(),
  orderBy: z.array(orderBySchema).optional(),
  limit: z.number().int().positive().optional(),
});

export type QueryIntent = z.infer<typeof queryIntentSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type OrderBy = z.infer<typeof orderBySchema>;