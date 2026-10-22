"use client";

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = "",
  ariaLabel = "Filter items",
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 gap-1 overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap ${
              isActive
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
