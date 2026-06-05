const RELATIVE_DAYS = /^-(\d+)\s*days?$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class DateResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DateResolutionError";
  }
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function resolveDateValue(
  value: string | number | boolean,
  now: Date = new Date()
): string | number | boolean {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (ISO_DATE.test(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();

  if (lower === "today") {
    return formatDate(now);
  }

  if (lower === "this month") {
    return formatDate(startOfMonth(now));
  }

  const relMatch = trimmed.match(RELATIVE_DAYS);
  if (relMatch) {
    const days = parseInt(relMatch[1], 10);
    const result = new Date(now);
    result.setUTCDate(result.getUTCDate() - days);
    return formatDate(result);
  }

  if (trimmed.startsWith(">=") || trimmed.startsWith("<=")) {
    const datePart = trimmed.slice(2).trim();
    if (ISO_DATE.test(datePart)) return datePart;
    return resolveDateValue(datePart, now) as string;
  }

  throw new DateResolutionError(`Unsupported date expression: ${value}`);
}

export function isDateFieldType(type: string): boolean {
  return type === "date";
}