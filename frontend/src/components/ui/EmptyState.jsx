export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 ${className}`}
    >
      {Icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-500 mb-4">
          <Icon className="w-7 h-7" aria-hidden="true" />
        </div>
      )}
      {title && <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>}
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
