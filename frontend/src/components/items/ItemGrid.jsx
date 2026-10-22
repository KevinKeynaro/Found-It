export function ItemGrid({ children, className = "" }) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-4 ${className}`}
    >
      {children}
    </div>
  );
}
