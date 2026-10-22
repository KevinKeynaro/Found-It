"use client";

import { useEffect, useRef, useSyncExternalStore, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function subscribe() {
  return () => {};
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  busy = false,
  maxWidth = "max-w-md",
  className = "",
  showCloseButton = true,
}) {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const dialogRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  const titleId = useId();
  const descId = useId();

  // Save previous active element on open and restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
    } else if (previousActiveElementRef.current) {
      if (typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Lock body scroll while dialog is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Focus trap and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    // Find all focusable elements
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    const focusableElements = dialogNode.querySelectorAll(focusableSelectors);
    if (focusableElements.length > 0) {
      // Focus first element or close button
      const firstFocusable = focusableElements[0];
      firstFocusable.focus();
    } else {
      dialogNode.focus();
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (!busy && onClose) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === "Tab") {
        const focusables = Array.from(dialogNode.querySelectorAll(focusableSelectors));
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, busy, onClose]);

  if (!isMounted || !isOpen) {
    return null;
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !busy && onClose) {
      onClose();
    }
  };

  return createPortal(
    <div
      role="presentation"
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4 focus-visible:outline-none animate-in zoom-in-95 duration-150 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h3 id={titleId} className="text-lg sm:text-xl font-bold text-slate-900">
                {title}
              </h3>
            )}
            {description && (
              <p id={descId} className="text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close dialog"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 min-h-[32px] min-w-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}
