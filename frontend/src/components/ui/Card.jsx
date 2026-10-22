export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
