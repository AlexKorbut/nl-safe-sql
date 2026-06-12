import { z } from "zod";

const schema = z.object({
  DATABASE_PATH: z.string().default("./data/app.db"),
  PSI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  AUDIT_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
  FREE_AUDITS_PER_DAY: z.coerce.number().int().min(0).default(3),
  // Until billing ships, every report is fully visible.
  ENFORCE_FREE_TIER: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

export const env = schema.parse(process.env);
