import "server-only";

export interface RequestContext {
  requestId: string;
  // Best-effort — userId is set after auth resolves; absent on public routes.
  userId?: string;
}

// AsyncLocalStorage is Node-only. Import it lazily and guard for browser /
// edge contexts where the module isn't available — this file must stay safe
// to import from client components (e.g. the service editor's hook pulls in
// the logger, which pulls in this module).
interface Storage {
  run<T>(ctx: RequestContext, fn: () => T): T;
  getStore(): RequestContext | undefined;
}

let storage: Storage | null = null;

function getStorage(): Storage | null {
  if (storage) return storage;
  if (typeof window !== "undefined") return null;
  try {
    // Guarded dynamic require so bundlers leave this as a runtime lookup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require("node:async_hooks") as typeof import("node:async_hooks");
    storage = new AsyncLocalStorage<RequestContext>();
    return storage;
  } catch {
    return null;
  }
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  const s = getStorage();
  return s ? s.run(ctx, fn) : fn();
}

export function getRequestContext(): RequestContext | undefined {
  return getStorage()?.getStore();
}

export function setRequestUserId(userId: string): void {
  const ctx = getStorage()?.getStore();
  if (ctx) ctx.userId = userId;
}

export function generateRequestId(): string {
  // Prefer Web Crypto (available in Edge, Node 19+, and modern browsers);
  // fall back to a simple random string for older Node.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
