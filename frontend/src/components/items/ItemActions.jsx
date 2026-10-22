"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReturnDialog } from "./ReturnDialog";
import { returnItem, reopenItem, deleteItem } from "@/lib/itemsApi";
import { useToast } from "@/context/ToastContext";
import {
  MESSAGES,
  ERROR_MESSAGES,
  getDeleteErrorMessage,
  getErrorMessage,
} from "@/lib/messages";

export function ItemActions({ item, onRefresh, onNotFound }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [activeDialog, setActiveDialog] = useState(null); // 'return' | 'reopen' | 'delete' | null
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (!item || !item.permissions) {
    return null;
  }

  const { can_edit, can_return, can_reopen, can_delete } = item.permissions;

  // If user cannot perform any action, render nothing
  if (!can_edit && !can_return && !can_reopen && !can_delete) {
    return null;
  }

  const handleOpenDialog = (dialogType) => {
    setActionError(null);
    setActiveDialog(dialogType);
  };

  const handleCloseDialog = () => {
    if (!loading) {
      setActiveDialog(null);
      setActionError(null);
    }
  };

  const handleError = async (err) => {
    const code = err?.code;
    const reason = err?.details?.reason;

    if (code === "ITEM_NOT_FOUND") {
      setActiveDialog(null);
      if (typeof onNotFound === "function") {
        onNotFound();
      }
      return;
    }

    if (code === "INVALID_STATE") {
      setActionError(ERROR_MESSAGES.INVALID_STATE);
      if (typeof onRefresh === "function") {
        await onRefresh();
      }
      return;
    }

    if (code === "DELETE_NOT_ALLOWED") {
      setActionError(getDeleteErrorMessage(reason));
      return;
    }

    if (code === "RETENTION_WINDOW_EXPIRED") {
      setActionError(ERROR_MESSAGES.RETENTION_WINDOW_EXPIRED);
      return;
    }

    if (code === "FORBIDDEN") {
      setActionError(ERROR_MESSAGES.FORBIDDEN);
      return;
    }

    setActionError(getErrorMessage(code, ERROR_MESSAGES.DEFAULT));
  };

  const handleReturnConfirm = async ({ returned_to }) => {
    if (loading) return;
    setLoading(true);
    setActionError(null);

    try {
      await returnItem(item.id, { returned_to });
      setActiveDialog(null);
      showToast(MESSAGES.items.itemReturnedSuccess);
      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (err) {
      await handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReopenConfirm = async () => {
    if (loading) return;
    setLoading(true);
    setActionError(null);

    try {
      await reopenItem(item.id);
      setActiveDialog(null);
      showToast(MESSAGES.items.itemReopenedSuccess);
      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (err) {
      await handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (loading) return;
    setLoading(true);
    setActionError(null);

    try {
      await deleteItem(item.id);
      setActiveDialog(null);
      showToast(MESSAGES.items.itemDeletedSuccess);
      router.push("/items");
    } catch (err) {
      await handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-2.5 w-full pt-1">
        {/* Edit Button */}
        {can_edit && (
          <Link
            href={`/items/${item.id}/edit`}
            className="w-full sm:w-auto"
          >
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="w-full sm:w-auto min-h-[38px] sm:min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm gap-1.5 text-slate-800 border-slate-300 hover:bg-slate-50"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>{MESSAGES.items.actions.edit}</span>
            </Button>
          </Link>
        )}

        {/* Mark as returned Button */}
        {can_return && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleOpenDialog("return")}
            className="w-full sm:w-auto min-h-[38px] sm:min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm gap-1.5 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>{MESSAGES.items.actions.markReturned}</span>
          </Button>
        )}

        {/* Reopen Button */}
        {can_reopen && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleOpenDialog("reopen")}
            className="w-full sm:w-auto min-h-[38px] sm:min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm gap-1.5 text-blue-800 border-blue-300 hover:bg-blue-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            <span>{MESSAGES.items.actions.reopen}</span>
          </Button>
        )}

        {/* Delete Button */}
        {can_delete && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleOpenDialog("delete")}
            className="w-full sm:w-auto min-h-[38px] sm:min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm gap-1.5 text-danger border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 className="w-3.5 h-3.5 text-danger" aria-hidden="true" />
            <span>{MESSAGES.items.actions.delete}</span>
          </Button>
        )}
      </div>

      {/* Return Dialog */}
      <ReturnDialog
        isOpen={activeDialog === "return"}
        onClose={handleCloseDialog}
        onConfirm={handleReturnConfirm}
        loading={loading}
        error={actionError}
      />

      {/* Reopen Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === "reopen"}
        onClose={handleCloseDialog}
        onConfirm={handleReopenConfirm}
        title={MESSAGES.items.reopenDialog.title}
        message={MESSAGES.items.reopenDialog.message}
        confirmLabel={loading ? MESSAGES.items.reopenDialog.reopening : MESSAGES.items.reopenDialog.confirm}
        loading={loading}
        error={actionError}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === "delete"}
        onClose={handleCloseDialog}
        onConfirm={handleDeleteConfirm}
        title={MESSAGES.items.deleteDialog.title}
        message={MESSAGES.items.deleteDialog.message}
        confirmLabel={loading ? MESSAGES.items.deleteDialog.deleting : MESSAGES.items.deleteDialog.confirm}
        danger
        loading={loading}
        error={actionError}
      />
    </>
  );
}
