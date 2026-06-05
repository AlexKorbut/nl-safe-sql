import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { initDatabase } from "./db/migrate.js";
import { DatabaseExecutor } from "./db/executor.js";
import { LlmService } from "./llm/llm-service.js";
import { AuditLogger } from "./audit/audit-logger.js";
import { QueryPipeline, PipelineError } from "./pipeline/query-pipeline.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/app.db";
const SHOW_SQL_PREVIEW = process.env.SHOW_SQL_PREVIEW === "true";

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required");
    process.exit(1);
  }

  const db = initDatabase(DATABASE_PATH);
  const executor = new DatabaseExecutor(db);
  const audit = new AuditLogger();
  const llm = new LlmService({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
  });

  const pipeline = new QueryPipeline({
    parseIntent: (q) => llm.parseQuestion(q),
    executor,
    audit,
    showSqlPreview: SHOW_SQL_PREVIEW,
  });

  const app = Fastify({ logger: true });
  const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
  const indexHtml = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");

  app.get("/", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(indexHtml);
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.post<{ Body: { question?: string } }>("/query", async (request, reply) => {
    const question = request.body?.question?.trim();
    if (!question) {
      return reply.status(400).send({
        error: "INVALID_REQUEST",
        message: "question is required",
      });
    }

    const requestId = crypto.randomUUID();

    try {
      const result = await pipeline.run({ question, requestId });
      return reply.send(result);
    } catch (err) {
      if (err instanceof PipelineError) {
        return reply.status(err.statusCode).send({
          error: err.code,
          message: err.message,
          requestId,
          ...err.details,
        });
      }
      request.log.error(err);
      return reply.status(500).send({
        error: "INTERNAL_ERROR",
        message: "Unexpected error",
        requestId,
      });
    }
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Server listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});