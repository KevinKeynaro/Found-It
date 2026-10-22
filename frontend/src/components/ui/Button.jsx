import { Loader2 } from "lucide-react";

export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none min-h-[44px] min-w-[44px]";

  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover active:bg-blue-900 shadow-sm",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 border border-slate-300",
    outline: "bg-transparent text-slate-700 hover:bg-slate-100 border border-slate-300 active:bg-slate-200",
    danger: "bg-danger text-white hover:bg-danger-hover active:bg-red-900 shadow-sm",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
