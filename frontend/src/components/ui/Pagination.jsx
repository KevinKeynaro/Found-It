"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  disabled = false,
  className = "",
}) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={`flex items-center justify-between gap-4 py-4 ${className}`}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || isFirstPage}
        onClick={() => onPageChange(currentPage - 1)}
        className="gap-1 min-h-[44px] min-w-[44px]"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        <span>Previous</span>
      </Button>

      <span className="text-sm font-medium text-slate-700 select-none">
        Page {currentPage} of {Math.max(1, totalPages)}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={disabled || isLastPage}
        onClick={() => onPageChange(currentPage + 1)}
        className="gap-1 min-h-[44px] min-w-[44px]"
        aria-label="Go to next page"
      >
        <span>Next</span>
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
