"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { MESSAGES } from "@/lib/messages";

export function ReturnDialog({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}) {
  const [returnedTo, setReturnedTo] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    onConfirm({ returned_to: returnedTo.trim() || null });
  };

  const handleClose = () => {
    if (!loading) {
      setReturnedTo("");
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      busy={loading}
      title={MESSAGES.items.returnDialog.title}
      description={MESSAGES.items.returnDialog.description}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <Alert variant="error" className="py-2.5">
            {error}
          </Alert>
        )}

        <Input
          id="returned-to-input"
          label={MESSAGES.items.returnDialog.handedToLabel}
          placeholder={MESSAGES.items.returnDialog.handedToPlaceholder}
          value={returnedTo}
          onChange={(e) => setReturnedTo(e.target.value)}
          maxLength={100}
          disabled={loading}
          autoFocus
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {MESSAGES.common.cancel}
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {MESSAGES.items.returnDialog.confirm}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
