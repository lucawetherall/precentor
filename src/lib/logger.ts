/**
 * Structured logger for Precentor.
 *
 * In production, logs are JSON-formatted for parsing by log aggregators.
 * In development, logs use human-readable formatting.
 *
 * Every entry carries a requestId sourced from AsyncLocalStorage when the log
 * call happens inside a request handler. Support incidents can then be traced
 * end-to-end in the log aggregator without reproducing the failure.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
  userId?: string;
}

import { getRequestContext } from "./request-context";

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
  const reqId = entry.requestId ? ` [${entry.requestId.slice(0, 8)}]` : "";
  return `[${entry.level.toUpperCase()}]${reqId} ${entry.message}${ctx}`;
}

function createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  const requestCtx = getRequestContext();
  return {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    requestId: requestCtx?.requestId,
    userId: requestCtx?.userId,
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
