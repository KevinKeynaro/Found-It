import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export function Alert({
  variant = "error",
  title,
  children,
  className = "",
}) {
  const variantStyles = {
    error: {
      container: "bg-red-50 border-red-200 text-red-800",
      icon: <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />,
    },
    warning: {
      container: "bg-amber-50 border-amber-200 text-amber-800",
      icon: <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />,
    },
    success: {
      container: "bg-green-50 border-green-200 text-green-800",
      icon: <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" aria-hidden="true" />,
    },
    info: {
      container: "bg-blue-50 border-blue-200 text-blue-800",
      icon: <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />,
    },
  };

  const style = variantStyles[variant] || variantStyles.error;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${style.container} ${className}`}
    >
      {style.icon}
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold">{title}</h5>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
