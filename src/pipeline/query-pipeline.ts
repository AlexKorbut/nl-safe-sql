import type { IntentParser } from "../llm/llm-service.js";
import {
  validateIntent,
  IntentValidationError,
  type ValidatedIntent,
} from "../validation/intent-validator.js";
import { buildQuery, type BuiltQuery } from "../sql/query-builder.js";
import { DatabaseExecutor } from "../db/executor.js";
import { formatResponse, type FormattedResponse } from "../response/formatter.js";
import type { AuditLogger } from "../audit/audit-logger.js";

export class PipelineError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export interface PipelineOptions {
  parseIntent: IntentParser;
  executor: DatabaseExecutor;
  audit: AuditLogger;
  showSqlPreview?: boolean;
}

export interface PipelineInput {
  question: string;
  requestId: string;
}

export class QueryPipeline {
  constructor(private readonly options: PipelineOptions) {}

  async run(input: PipelineInput): Promise<FormattedResponse> {
    const { question, requestId } = input;
    const { audit, parseIntent, executor, showSqlPreview } = this.options;
    const timestamp = new Date().toISOString();

    let rawIntent: unknown;
    try {
      rawIntent = await parseIntent(question);
    } catch (err) {
      const message = err instanceof Error ? err.message : "LLM failed";
      audit.log({
        requestId,
        question,
        error: message,
        errorCode: "LLM_ERROR",
        success: false,
        timestamp,
      });
      throw new PipelineError(502, "LLM_ERROR", message);
    }

    audit.log({
      requestId,
      question,
      rawIntent,
      success: true,
      timestamp,
    });

    let validated: ValidatedIntent;
    try {
      validated = validateIntent(rawIntent);
    } catch (err) {
      const code =
        err instanceof IntentValidationError ? err.code : "VALIDATION_ERROR";
      const message = err instanceof Error ? err.message : "Validation failed";
      audit.log({
        requestId,
        question,
        rawIntent,
        error: message,
        errorCode: code,
        success: false,
        timestamp,
      });
      throw new PipelineError(400, code, message, { rawIntent });
    }

    let built: BuiltQuery;
    try {
      built = buildQuery(validated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Build failed";
      audit.log({
        requestId,
        question,
        rawIntent,
        error: message,
        errorCode: "BUILD_ERROR",
        success: false,
        timestamp,
      });
      throw new PipelineError(500, "BUILD_ERROR", message);
    }

    try {
      const result = executor.execute(built.sql, built.params);
      audit.log({
        requestId,
        question,
        rawIntent,
        builtSql: built.sql,
        params: built.params,
        success: true,
        timestamp,
      });

      return formatResponse(validated.intent, built, result, {
        showSqlPreview,
        rawIntent,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      audit.log({
        requestId,
        question,
        rawIntent,
        builtSql: built.sql,
        params: built.params,
        error: message,
        errorCode: "DB_ERROR",
        success: false,
        timestamp,
      });
      throw new PipelineError(500, "DB_ERROR", message);
    }
  }
}