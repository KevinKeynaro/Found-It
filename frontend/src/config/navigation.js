import { PackageSearch, PlusCircle, Users } from "lucide-react";

export const NAV_ITEMS = [
  {
    key: "items",
    href: "/items",
    label: "Items",
    icon: PackageSearch,
    roles: ["student", "teacher", "admin"],
    enabled: true, // Milestone 5 placeholder
  },
  {
    key: "post-item",
    href: "/items/new",
    label: "Post item",
    icon: PlusCircle,
    roles: ["teacher", "admin"],
    enabled: false, // Milestone 7
  },
  {
    key: "users",
    href: "/admin/users",
    label: "Users",
    icon: Users,
    roles: ["admin"],
    enabled: false, // Milestone 8
  },
];

export function getVisibleNavItems(userRole) {
  if (!userRole) return [];
  return NAV_ITEMS.filter((item) => item.enabled && item.roles.includes(userRole));
}
