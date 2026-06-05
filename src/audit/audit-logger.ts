export interface AuditEntry {
  requestId: string;
  question: string;
  rawIntent?: unknown;
  builtSql?: string;
  params?: unknown[];
  error?: string;
  errorCode?: string;
  success: boolean;
  timestamp: string;
}

export class AuditLogger {
  private readonly entries: AuditEntry[] = [];

  log(entry: AuditEntry): void {
    this.entries.push(entry);
    const level = entry.success ? "info" : "warn";
    console[level](
      JSON.stringify({
        type: "audit",
        requestId: entry.requestId,
        success: entry.success,
        errorCode: entry.errorCode,
        question: entry.question.slice(0, 200),
      })
    );
  }

  getEntries(): readonly AuditEntry[] {
    return this.entries;
  }
}