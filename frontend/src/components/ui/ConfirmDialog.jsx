"use client";

import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { Alert } from "./Alert";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  error = null,
  maxWidth = "max-w-md",
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      busy={loading}
      maxWidth={maxWidth}
      showCloseButton={!loading}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {danger && (
            <div className="w-10 h-10 rounded-full bg-red-100 text-danger flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            {message && (
              <div className="text-sm text-slate-600 leading-relaxed">
                {message}
              </div>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="error" className="py-2.5">
            {error}
          </Alert>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
