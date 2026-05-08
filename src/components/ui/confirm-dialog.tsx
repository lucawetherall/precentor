"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmContext, type ConfirmOptions } from "./use-confirm";

interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (result: boolean) => void;
}

/**
 * Hosts the application's confirm dialog. Place once near the root of the
 * app (alongside `ToastProvider`) so any descendant can call `useConfirm()`.
 *
 * Resolution rules:
 * - Confirm button click → resolves `true`.
 * - Cancel button click, Escape key, overlay click → resolves `false`.
 *
 * Only one confirm runs at a time. Calling `confirm()` while another is
 * pending will reject the previous one with `false` and present the new one,
 * mirroring browser-native `confirm()` semantics where only one modal is
 * onscreen.
 */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const titleId = useId();
  const descId = useId();
  // Mirror `pending` into a ref so event handlers (which fire after the
  // render that set the new state) can resolve the right promise without
  // triggering a re-render or capturing stale closures. Synced via effect
  // because writing refs during render is forbidden by the React rules.
  const pendingRef = useRef<PendingConfirm | null>(null);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // Resolve any in-flight confirm with `false` before opening the new one.
      if (pendingRef.current) pendingRef.current.resolve(false);
      const next = { opts, resolve };
      // Update the ref immediately so a tightly-sequenced second call still
      // sees the just-rejected pending. (The effect would update one render
      // later — too late for synchronous re-entry from the same task.)
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.resolve(result);
  }, []);

  return (
    <ConfirmContext value={{ confirm }}>
      {children}
      <Dialog
        open={pending !== null}
        onOpenChange={(next) => {
          // Dialog reports `open=false` for Escape, overlay click, and the
          // built-in close button — all of those count as "cancelled".
          if (!next) settle(false);
        }}
      >
        {pending && (
          <DialogContent
            aria-labelledby={titleId}
            aria-describedby={pending.opts.description ? descId : undefined}
          >
            <div className="space-y-2">
              <h2 id={titleId} className="text-lg font-heading font-semibold">
                {pending.opts.title}
              </h2>
              {pending.opts.description && (
                <p id={descId} className="text-sm text-muted-foreground">
                  {pending.opts.description}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => settle(false)}>
                {pending.opts.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={pending.opts.destructive ? "destructive" : "default"}
                onClick={() => settle(true)}
                autoFocus
              >
                {pending.opts.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext>
  );
}
