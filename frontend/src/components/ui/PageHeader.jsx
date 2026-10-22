export function PageHeader({
  title,
  description,
  actions,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 lg:pb-8 border-b border-slate-200 ${className}`}
    >
      <div className="space-y-1 lg:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base lg:text-lg text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 lg:gap-4 shrink-0">{actions}</div>}
    </div>
  );
}
