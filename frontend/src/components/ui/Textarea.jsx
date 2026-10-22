import { useId } from "react";

export function Textarea({
  id: customId,
  label,
  helperText,
  error,
  rows = 4,
  className = "",
  required = false,
  ...props
}) {
  const generatedId = useId();
  const id = customId || generatedId;
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-slate-800 flex items-center gap-1">
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed resize-y ${
          error ? "border-danger focus-visible:ring-danger" : "border-slate-300 hover:border-slate-400"
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-sm text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
