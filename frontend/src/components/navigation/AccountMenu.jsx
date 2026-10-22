"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Key, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MESSAGES } from "@/lib/messages";

export function AccountMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const roleLabel = MESSAGES.roles[user.role] || user.role;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Account menu"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[40px]"
      >
        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
          <User className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-sm font-semibold text-slate-900 leading-tight">
            {user.name}
          </span>
          <span className="text-xs text-slate-500 leading-none capitalize">
            {roleLabel}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 lg:w-72 origin-top-right rounded-lg lg:rounded-xl bg-white border border-slate-200 shadow-dropdown p-1.5 lg:p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-2 lg:px-4 lg:py-3 border-b border-slate-100">
            <p className="text-sm lg:text-base font-semibold text-slate-900 truncate">
              {user.name}
            </p>
            <p className="text-xs lg:text-sm text-slate-500 truncate">{user.email}</p>
            <div className="mt-1.5 lg:mt-2">
              <span className="inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-1 rounded text-xs lg:text-sm font-medium bg-slate-100 text-slate-800">
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="py-1 lg:py-1.5">
            <Link
              href="/change-password"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 lg:gap-3 px-3 py-2 lg:px-4 lg:py-2.5 rounded-md lg:rounded-lg text-sm lg:text-base text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px]"
            >
              <Key className="w-4 h-4 lg:w-5 lg:h-5 text-slate-500" aria-hidden="true" />
              <span>{MESSAGES.nav.changePassword}</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              role="menuitem"
              className="w-full flex items-center gap-2.5 lg:gap-3 px-3 py-2 lg:px-4 lg:py-2.5 rounded-md lg:rounded-lg text-sm lg:text-base text-danger hover:bg-red-50 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <LogOut className="w-4 h-4 lg:w-5 lg:h-5 text-danger" aria-hidden="true" />
              <span>
                {signingOut ? MESSAGES.auth.signingOut : MESSAGES.nav.signOut}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
