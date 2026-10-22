"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { AccountMenu } from "./AccountMenu";
import { getVisibleNavItems } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";

export function TopBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = getVisibleNavItems(user?.role);

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 lg:gap-8 xl:gap-10">
          <Logo href="/items" />

          {/* Desktop navigation (>= 1024px) */}
          <nav className="hidden lg:flex items-center gap-1.5 lg:gap-2">
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
                  className={`inline-flex items-center gap-2.5 px-3 py-2 lg:px-4 lg:py-2.5 rounded-lg lg:rounded-xl text-sm lg:text-base font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
