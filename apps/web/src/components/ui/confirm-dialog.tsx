import { useState, useCallback, useRef } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import clsx from "clsx";
import { Button } from "./button";

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: "danger" | "default";
}

const initial: ConfirmDialogState = {
  open: false,
  title: "",
  description: "",
  confirmLabel: "Confirm",
  variant: "default",
};

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
}

/**
 * Hook that returns a `confirm()` function and a `<ConfirmDialog />` element.
 * Render the element once (e.g. at the bottom of your component) and call
 * `confirm({ title, description })` to show it — returns a promise that
 * resolves `true` (confirmed) or `false` (cancelled).
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmDialogState>(initial);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        title: opts.title,
        description: opts.description,
        confirmLabel: opts.confirmLabel ?? "Confirm",
        variant: opts.variant ?? "default",
      });
    });
  }, []);

  const handleResult = useCallback((result: boolean) => {
    setState(initial);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const dialog = (
    <AlertDialogPrimitive.Root
      open={state.open}
      onOpenChange={(open) => { if (!open) handleResult(false); }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AlertDialogPrimitive.Content
          className={clsx(
            "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "bg-surface rounded-xl shadow-2xl w-[400px] p-6 focus:outline-none",
          )}
        >
          <AlertDialogPrimitive.Title className="text-base font-semibold m-0 mb-2">
            {state.title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="text-sm text-muted m-0 mb-5">
            {state.description}
          </AlertDialogPrimitive.Description>
          <div className="flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="secondary" data-testid="confirm-dialog-cancel">
                Cancel
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button
                variant={state.variant === "danger" ? "danger" : "primary"}
                data-testid="confirm-dialog-confirm"
                onClick={() => handleResult(true)}
              >
                {state.confirmLabel}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );

  return { confirm, dialog };
}

// ── useAlert ─────────────────────────────────────────────────
// Informational dialog with a single "OK" button (no cancel).

interface AlertState {
  open: boolean;
  title: string;
  description: string;
}

const alertInitial: AlertState = { open: false, title: "", description: "" };

export interface AlertOptions {
  title: string;
  description: string;
}

export function useAlert() {
  const [state, setState] = useState<AlertState>(alertInitial);

  const alert = useCallback((opts: AlertOptions) => {
    setState({ open: true, title: opts.title, description: opts.description });
  }, []);

  const dismiss = useCallback(() => {
    setState(alertInitial);
  }, []);

  const alertDialog = (
    <AlertDialogPrimitive.Root
      open={state.open}
      onOpenChange={(open) => { if (!open) dismiss(); }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AlertDialogPrimitive.Content
          className={clsx(
            "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "bg-surface rounded-xl shadow-2xl w-[400px] p-6 focus:outline-none",
          )}
        >
          <AlertDialogPrimitive.Title className="text-base font-semibold m-0 mb-2">
            {state.title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="text-sm text-muted m-0 mb-5">
            {state.description}
          </AlertDialogPrimitive.Description>
          <div className="flex justify-end">
            <AlertDialogPrimitive.Action asChild>
              <Button variant="primary" data-testid="alert-dialog-ok" onClick={dismiss}>
                OK
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );

  return { alert, dismiss, alertDialog };
}
