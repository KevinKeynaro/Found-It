import { Badge } from "@/components/ui/Badge";

export function StatusBadge({ item, className = "" }) {
  if (!item) return null;

  if (item.status === "returned") {
    return (
      <Badge variant="archive" className={className}>
        Returned
      </Badge>
    );
  }

  if (item.is_overdue) {
    return (
      <Badge variant="warning" className={className}>
        Overdue
      </Badge>
    );
  }

  return null;
}
