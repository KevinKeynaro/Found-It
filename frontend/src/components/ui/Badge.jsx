export function Badge({
  children,
  variant = "default",
  className = "",
  ...props
}) {
  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    warning: "bg-amber-100 text-amber-900 border-amber-300 font-semibold",
    archive: "bg-slate-200 text-slate-800 border-slate-300 font-medium",
    success: "bg-green-100 text-green-800 border-green-200 font-medium",
    danger: "bg-red-100 text-red-800 border-red-200 font-medium",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 lg:px-3 lg:py-1 rounded-full text-xs lg:text-sm border tracking-wide select-none ${
        variants[variant] || variants.default
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
