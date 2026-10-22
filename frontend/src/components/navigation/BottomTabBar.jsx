"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getVisibleNavItems } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";

export function BottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = getVisibleNavItems(user?.role);

  if (navItems.length === 0) return null;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 lg:hidden flex items-center justify-around h-16 px-2 safe-area-inset-bottom"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.key === "items"
            ? pathname.startsWith("/items/") && !pathname.startsWith("/items/new")
            : pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isActive
                ? "text-primary font-semibold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
