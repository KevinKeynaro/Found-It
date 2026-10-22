export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded-md ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
