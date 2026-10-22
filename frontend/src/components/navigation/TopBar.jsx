"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { AccountMenu } from "./AccountMenu";
import { getVisibleNavItems } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";

export function TopBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hoverRect, setHoverRect] = useState({ left: 0, width: 0, visible: false });
  const navRefs = useRef({});

  const navItems = getVisibleNavItems(user?.role);

  useEffect(() => {
    const handleResize = () => {
      setHoverRect((prev) => ({ ...prev, visible: false }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseEnter = (key) => {
    const el = navRefs.current[key];
    if (el) {
      setHoverRect({
        left: el.offsetLeft,
        width: el.offsetWidth,
        visible: true,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverRect((prev) => ({ ...prev, visible: false }));
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      <div className="max-w-[68rem] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 h-16 flex items-center justify-between gap-4">
        {/* Left section: Logo and Nav with prominent gap */}
        <div className="flex items-center gap-10 lg:gap-14 xl:gap-16">
          <Logo href="/items" />

          {/* Desktop navigation (>= 1024px) with sliding hover drag effect */}
          <nav
            aria-label="Desktop navigation"
            onMouseLeave={handleMouseLeave}
            className="relative hidden lg:flex items-center gap-4 lg:gap-6"
          >
            {/* Thinner sliding hover indicator (drag effect) */}
            <span
              aria-hidden="true"
              className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md bg-slate-100 transition-all duration-200 ease-out pointer-events-none"
              style={{
                left: `${hoverRect.left}px`,
                width: `${hoverRect.width}px`,
                opacity: hoverRect.visible ? 1 : 0,
              }}
            />

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
                  ref={(el) => {
                    if (el) navRefs.current[item.key] = el;
                  }}
                  href={item.href}
                  onMouseEnter={() => handleMouseEnter(item.key)}
                  className={`relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right section: Account Menu (margin preserved) */}
        <div className="flex items-center gap-2">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
