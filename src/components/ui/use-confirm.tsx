"use client";

import { createContext, useContext } from "react";

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Defaults to "Confirm". */
  confirmLabel?: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** When true, the confirm button uses the destructive (red) styling. */
  destructive?: boolean;
}

export interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Hook returning a `confirm` function that opens the application's
 * `ConfirmDialog` and resolves to `true` (user confirmed) or `false`
 * (cancelled / dismissed). Must be used within `ConfirmDialogProvider`.
 *
 * Replaces `window.confirm()` calls — same shape (`if (await confirm(...))`)
 * but styled, accessible, and non-blocking.
 *
 * @example
 * const confirm = useConfirm();
 * if (await confirm({ title: "Delete?", destructive: true })) doIt();
 */
export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return ctx.confirm;
}
