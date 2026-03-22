/**
 * Structured logger for Precentor.
 *
 * In production, logs are JSON-formatted for parsing by log aggregators.
 * In development, logs use human-readable formatting.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
  return `[${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
}

function createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    const entry = createEntry("info", message, context);
    console.log(formatEntry(entry));
  },

  warn(message: string, context?: Record<string, unknown>) {
    const entry = createEntry("warn", message, context);
    console.warn(formatEntry(entry));
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const errorContext: Record<string, unknown> = { ...context };
    if (error instanceof Error) {
      errorContext.error = error.message;
      errorContext.stack = error.stack;
    } else if (error !== undefined) {
      errorContext.error = String(error);
    }
    const entry = createEntry("error", message, errorContext);
    console.error(formatEntry(entry));
  },
};
