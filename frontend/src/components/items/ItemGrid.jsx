export function ItemGrid({ children, className = "" }) {
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 ${className}`}
    >
      {children}
    </div>
  );
}
